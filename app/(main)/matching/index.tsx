import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getMyMatch, getMatchPartner, Match } from '../../../lib/api/matches';
import { supabase } from '../../../lib/supabase';
import { CATEGORY_MAP, getCharacter } from '../../../lib/appData';
import { notify } from '../../../lib/ui';

function isInSelectionWindow(): boolean {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.getUTCDay() === 0 && kst.getUTCHours() >= 20;
}

export default function MatchingScreen() {
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [myCategory, setMyCategory] = useState<string | null>(null);
  const [inWindow, setInWindow] = useState(false);

  useEffect(() => {
    setInWindow(isInSelectionWindow());
    loadMatch();
    loadMyCategory();
  }, []);

  async function loadMatch() {
    try {
      setLoading(true);
      const m = await getMyMatch();
      setMatch(m);
      if (m) {
        const p = await getMatchPartner(m);
        setPartner(p);
      }
    } catch (e: any) {
      notify('오류', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMyCategory() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('match_category')
      .eq('id', user.id)
      .single();
    setMyCategory(data?.match_category ?? null);
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color="#4A7C59" />
    </View>
  );

  const cat = myCategory ? CATEGORY_MAP[myCategory] : null;
  const partnerCharacter = getCharacter(partner?.avatar_type);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>도담 매칭</Text>

        {inWindow && (
          <TouchableOpacity
            style={styles.banner}
            onPress={() => router.push('/(main)/village/category')}
          >
            <Text style={styles.bannerEmoji}>🗓️</Text>
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>새로운 친구를 만날 시간이에요</Text>
              <Text style={styles.bannerSub}>관심사를 설정해주세요</Text>
            </View>
          </TouchableOpacity>
        )}

        {cat && (
          <TouchableOpacity
            style={styles.categoryRow}
            onPress={() => router.push('/(main)/village/category')}
          >
            <Text style={styles.categoryLabel}>이번 주 관심사</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={styles.categoryName}>{cat.name}</Text>
            </View>
            <Text style={styles.categoryEdit}>변경</Text>
          </TouchableOpacity>
        )}

        {!cat && !inWindow && (
          <TouchableOpacity
            style={styles.categoryRowEmpty}
            onPress={() => router.push('/(main)/village/category')}
          >
            <Text style={styles.categoryEmptyText}>관심사를 설정하면 잘 맞는 친구와 매칭돼요.</Text>
          </TouchableOpacity>
        )}

        {!match ? (
          <View style={styles.waitBox}>
            <Text style={styles.waitEmoji}>📮</Text>
            <Text style={styles.waitTitle}>매칭 대기 중이에요</Text>
            <Text style={styles.waitDesc}>매주 월요일 00시에{'\n'}새로운 도담 친구가 배정돼요!</Text>
          </View>
        ) : (
          <View style={styles.matchedBox}>
            <Text style={styles.matchedEmoji}>🎉</Text>
            <Text style={styles.matchedTitle}>새 친구를 찾았어요!</Text>
            <View style={styles.partnerCard}>
              <View style={[styles.partnerAvatar, { backgroundColor: partner?.avatar_color ?? '#A8C5A0' }]}>
                <Text style={styles.partnerAvatarEmoji}>{partnerCharacter.name.slice(0, 1)}</Text>
              </View>
              <View>
                <Text style={styles.partnerNickname}>{partner?.nickname ?? '친구'}</Text>
                <Text style={styles.partnerInfo}>
                  {[partner?.location, partner?.age ? `${partner.age}세` : null].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push({
                  pathname: '/(main)/matching/letter/write',
                  params: { matchId: match.id, receiverId: partner?.id },
                })}
              >
                <Text style={styles.actionEmoji}>✍️</Text>
                <Text style={styles.actionText}>편지 쓰기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/(main)/matching/letter/inbox')}
              >
                <Text style={styles.actionEmoji}>📬</Text>
                <Text style={styles.actionText}>받은 편지</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/(main)/matching/letter/status')}
              >
                <Text style={styles.actionEmoji}>🚚</Text>
                <Text style={styles.actionText}>배달 현황</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.weekInfo}>{match.week_start} ~ {match.week_end}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFAF6' },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#2C2C2C', marginBottom: 20 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A7C59',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  bannerEmoji: { fontSize: 28 },
  bannerText: { flex: 1 },
  bannerTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  bannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8F0EA',
    gap: 8,
  },
  categoryLabel: { fontSize: 12, color: '#888' },
  categoryBadge: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryEmoji: { fontSize: 18 },
  categoryName: { fontSize: 14, fontWeight: '700', color: '#2C2C2C' },
  categoryEdit: { fontSize: 13, color: '#4A7C59', fontWeight: '600' },
  categoryRowEmpty: {
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  categoryEmptyText: { fontSize: 13, color: '#777', textAlign: 'center' },
  waitBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  waitEmoji: { fontSize: 80 },
  waitTitle: { fontSize: 20, fontWeight: '700', color: '#2C2C2C' },
  waitDesc: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 24 },
  matchedBox: { flex: 1, alignItems: 'center', gap: 20 },
  matchedEmoji: { fontSize: 60 },
  matchedTitle: { fontSize: 22, fontWeight: '700', color: '#2C2C2C' },
  partnerCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 16,
    width: '100%', borderWidth: 1.5, borderColor: '#4A7C59',
  },
  partnerAvatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  partnerAvatarEmoji: { fontSize: 24, fontWeight: '700', color: '#fff' },
  partnerNickname: { fontSize: 18, fontWeight: '700', color: '#2C2C2C' },
  partnerInfo: { fontSize: 13, color: '#888', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 12, width: '100%' },
  actionButton: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#F0F0F0',
  },
  actionEmoji: { fontSize: 28 },
  actionText: { fontSize: 12, color: '#555', fontWeight: '600' },
  weekInfo: { fontSize: 12, color: '#aaa' },
});
