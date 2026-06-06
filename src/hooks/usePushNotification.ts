'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type PushPermissionState = NotificationPermission | 'unsupported';

type UsePushNotificationOptions = {
  applicationServerKey?: string;
  subscribeUrl?: string;
  accessToken?: string | null;
  getAccessToken?: () => Promise<string | null>;
};

type PushNotificationState = {
  isSupported: boolean;
  isLoading: boolean;
  permission: PushPermissionState;
  error: string | null;
  subscription: PushSubscription | null;
  isSubscribed: boolean;
  requestPermissionAndSubscribe: () => Promise<PushSubscription | null>;
  unsubscribe: () => Promise<boolean>;
};

const DEFAULT_SUBSCRIBE_URL = '/api/push/subscribe';

async function registerAndWaitForActiveServiceWorker() {
  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function getInitialPermission(): PushPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  return Notification.permission;
}

export function usePushNotification(
  options: UsePushNotificationOptions = {}
): PushNotificationState {
  const [permission, setPermission] = useState<PushPermissionState>(getInitialPermission);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  // options는 호출부에서 매 렌더 새 객체로 전달되므로 ref에 담아 콜백을 안정화한다.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const isSupported = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }, []);

  // 마운트 시 이미 등록된 구독이 있으면 상태에 반영(새로고침 후에도 켜짐/꺼짐 유지)
  useEffect(() => {
    if (!isSupported) return;
    let cancelled = false;
    (async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const existing = registration ? await registration.pushManager.getSubscription() : null;
        if (!cancelled) setSubscription(existing);
      } catch {
        // 조회 실패는 조용히 무시 (버튼은 '켜기' 상태로 둠)
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSupported]);

  const requestPermissionAndSubscribe = useCallback(async () => {
    setError(null);

    if (!isSupported) {
      setPermission('unsupported');
      setError('이 브라우저는 웹 푸시 알림을 지원하지 않습니다.');
      return null;
    }

    const applicationServerKey =
      optionsRef.current.applicationServerKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!applicationServerKey) {
      setError('NEXT_PUBLIC_VAPID_PUBLIC_KEY 환경변수가 설정되어 있지 않습니다.');
      return null;
    }

    setIsLoading(true);

    try {
      const requestedPermission = await Notification.requestPermission();
      setPermission(requestedPermission);

      if (requestedPermission !== 'granted') {
        setError('알림 권한이 허용되지 않았습니다.');
        return null;
      }

      const registration = await registerAndWaitForActiveServiceWorker();
      const existingSubscription = await registration.pushManager.getSubscription();
      const nextSubscription =
        existingSubscription ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(applicationServerKey),
        }));

      const token = optionsRef.current.accessToken ?? (await optionsRef.current.getAccessToken?.()) ?? null;
      const response = await fetch(optionsRef.current.subscribeUrl || DEFAULT_SUBSCRIBE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(nextSubscription),
      });

      if (!response.ok) {
        const responseBody = await response.json().catch(() => null);
        throw new Error(responseBody?.error || '푸시 구독 저장에 실패했습니다.');
      }

      setSubscription(nextSubscription);
      return nextSubscription;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '푸시 구독 중 오류가 발생했습니다.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    setError(null);

    if (!isSupported) {
      return false;
    }

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const existing = registration ? await registration.pushManager.getSubscription() : null;

      if (!existing) {
        setSubscription(null);
        return true;
      }

      const endpoint = existing.endpoint;
      await existing.unsubscribe();

      // 서버 DB에서도 구독 삭제 (실패해도 브라우저 구독은 이미 해제됨)
      const token = optionsRef.current.accessToken ?? (await optionsRef.current.getAccessToken?.()) ?? null;
      await fetch(optionsRef.current.subscribeUrl || DEFAULT_SUBSCRIBE_URL, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ endpoint }),
      });

      setSubscription(null);
      return true;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '알림 해제 중 오류가 발생했습니다.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    isLoading,
    permission,
    error,
    subscription,
    isSubscribed: subscription !== null,
    requestPermissionAndSubscribe,
    unsubscribe,
  };
}
