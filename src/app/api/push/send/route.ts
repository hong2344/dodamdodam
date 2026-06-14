import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import webpush, { WebPushError } from 'web-push';

export const runtime = 'nodejs';

type PushEventType =
  | 'matching_completed'
  | 'letter_opened'
  | 'letter_sent'
  | 'letter_arrived'
  | 'matching_open'
  | 'letter_unread_reminder'
  | 'matching_no_letter';

type SendPushRequest = {
  userId?: string;
  type?: PushEventType;
  url?: string;
  data?: Record<string, unknown>;
  // 기본 메시지(PUSH_MESSAGES) 대신 보낼 커스텀 제목/본문 (선택)
  title?: string;
  body?: string;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

const PUSH_MESSAGES: Record<PushEventType, { title: string; body?: string }> = {
  matching_completed: {
    title: '매칭이 완료되었습니다',
    body: '누구와 매칭이 되었을까요? 얼른 확인해보세요~',
  },
  letter_opened: {
    title: '상대방이 편지를 열람했습니다',
  },
  letter_sent: {
    title: '상대방이 편지를 보냈습니다',
  },
  letter_arrived: {
    title: '상대방이 보낸 편지가 도착했습니다',
  },
  matching_open: {
    title: '이번 주 매칭 신청이 시작됐어요',
    body: '자정 전까지 고민 카테고리를 고르거나 바꿀 수 있어요.',
  },
  letter_unread_reminder: {
    title: '아직 읽지 않은 편지가 있어요',
    body: '편지집에서 따뜻한 마음을 확인해보세요.',
  },
  matching_no_letter: {
    title: '마음친구가 기다리고 있어요',
    body: '이번 주 친구에게 첫 편지를 보내보세요.',
  },
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} 환경변수가 설정되어 있지 않습니다.`);
  }

  return value;
}

function createSupabaseAdminClient() {
  return createClient(getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'), getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function configureWebPush() {
  webpush.setVapidDetails(
    getRequiredEnv('VAPID_SUBJECT'),
    getRequiredEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY'),
    getRequiredEnv('VAPID_PRIVATE_KEY')
  );
}

function isExpiredSubscriptionError(error: unknown) {
  return error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410);
}

export async function POST(request: NextRequest) {
  try {
    const pushSecret = getRequiredEnv('PUSH_API_SECRET');
    const authorization = request.headers.get('authorization');

    if (authorization !== `Bearer ${pushSecret}`) {
      return NextResponse.json({ error: '푸시 전송 권한이 없습니다.' }, { status: 401 });
    }

    const body = (await request.json()) as SendPushRequest;

    if (!body.userId || !body.type || !PUSH_MESSAGES[body.type]) {
      return NextResponse.json({ error: 'userId와 유효한 type이 필요합니다.' }, { status: 400 });
    }

    configureWebPush();

    const supabase = createSupabaseAdminClient();
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', body.userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (subscriptions || []) as PushSubscriptionRow[];
    const message = PUSH_MESSAGES[body.type];
    const title = body.title || message.title;
    const bodyText = body.body ?? message.body ?? '';
    await supabase.from('notifications').insert({
      user_id: body.userId,
      type: body.type,
      payload: {
        title,
        message: bodyText,
        url: body.url || '/',
        data: body.data || {},
      },
    });

    const payload = JSON.stringify({
      title,
      body: bodyText,
      url: body.url || '/',
      data: {
        type: body.type,
        ...(body.data || {}),
      },
    });

    const results = await Promise.allSettled(
      rows.map((subscription) =>
        webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload
        )
      )
    );

    const expiredSubscriptionIds = rows
      .filter((_subscription, index) => {
        const result = results[index];
        return result.status === 'rejected' && isExpiredSubscriptionError(result.reason);
      })
      .map((subscription) => subscription.id);

    if (expiredSubscriptionIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', expiredSubscriptionIds);
    }

    return NextResponse.json({
      ok: true,
      sent: results.filter((result) => result.status === 'fulfilled').length,
      failed: results.filter((result) => result.status === 'rejected').length,
      removed: expiredSubscriptionIds.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '푸시 알림 전송 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
