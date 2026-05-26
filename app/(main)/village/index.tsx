import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getMyProfile } from '../../../lib/api/auth';
import { getMatchStatus } from '../../../lib/api/matches';
import { Profile } from '../../../lib/supabase';

export default function VillageScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [matchStatus, setMatchStatus] = useState<'waiting' | 'active' | 'completed'>('waiting');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [p, m] = await Promise.all([getMyProfile(), getMatchStatus()]);
        setProfile(p);
        setMatchStatus(m);
      } catch (e: any) {
        Alert.alert('오류', e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color="#4A7C59" />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>안녕하세요 👋</Text>
          <Text style={styles.nickname}>{profile?.nickname ?? '이웃'}</Text>
        </View>
        <View style={styles.pointBadge}>
          <Text style={styles.pointText}>⭐ {profile?.points ?? 0}P</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.avatarCard}
        onPress={() => router.push('/(main)/village/avatar')}
      >
        <View style={[styles.avatar, { backgroundColor: profile?.avatar_color ?? '#A8C5A0' }]}>
          <Text style={styles.avatarEmoji}>🧑</Text>
        </View>
        <View style={styles.avatarInfo}>
          <Text style={styles.avatarName}>{profile?.nickname}</Text>
          <Text style={styles.avatarSub}>{profile?.location} · Lv.{profile?.level ?? 1}</Text>
        </View>
        <Text style={styles.avatarEdit}>꾸미기 →</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>편지 현황</Text>
        {matchStatus === 'waiting' && (
          <TouchableOpacity
            style={styles.matchCard}
            onPress={() => router.push('/(main)/matching')}
          >
            <Text style={styles.matchEmoji}>📮</Text>
            <Text style={styles.matchTitle}>매칭 대기중</Text>
            <Text style={styles.matchDesc}>버튼을 눌러 편지 친구를 찾아보세요!</Text>
          </TouchableOpacity>
        )}
        {matchStatus === 'active' && (
          <TouchableOpacity
            style={[styles.matchCard, styles.matchCardActive]}
            onPress={() => router.push('/(main)/matching')}
          >
            <Text style={styles.matchEmoji}>📬</Text>
            <Text style={styles.matchTitle}>매칭 완료!</Text>
            <Text style={styles.matchDesc}>편지를 쓰거나 받은 편지를 확인하세요.</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>바로가기</Text>
        <View style={styles.quickMenu}>
          <TouchableOpacity
            style={styles.quickItem}
            onPress={() => router.push('/(main)/matching/letter/inbox')}
          >
            <Text style={styles.quickEmoji}>📥</Text>
            <Text style={styles.quickText}>받은 편지</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickItem}
            onPress={() => router.push('/(main)/matching/letter/status')}
          >
            <Text style={styles.quickEmoji}>🚚</Text>
            <Text style={styles.quickText}>배달 현황</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickItem}
            onPress={() => router.push('/(main)/shop')}
          >
            <Text style={styles.quickEmoji}>🛍</Text>
            <Text style={styles.quickText}>포인트샵</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFAF6' },
  inner: { padding: 24, paddingTop: 60, gap: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 14, color: '#888' },
  nickname: { fontSize: 24, fontWeight: '700', color: '#2C2C2C' },
  pointBadge: {
    backgroundColor: '#F0F7F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pointText: { fontSize: 14, color: '#4A7C59', fontWeight: '600' },
  avatarCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarEmoji: { fontSize: 28 },
  avatarInfo: { flex: 1 },
  avatarName: { fontSize: 16, fontWeight: '600', color: '#2C2C2C' },
  avatarSub: { fontSize: 13, color: '#888', marginTop: 2 },
  avatarEdit: { fontSize: 13, color: '#4A7C59' },
  section: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2C2C2C' },
  matchCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 6,
    borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  matchCardActive: { borderColor: '#4A7C59', backgroundColor: '#F0F7F2' },
  matchEmoji: { fontSize: 32 },
  matchTitle: { fontSize: 18, fontWeight: '700', color: '#2C2C2C' },
  matchDesc: { fontSize: 13, color: '#666' },
  quickMenu: { flexDirection: 'row', gap: 12 },
  quickItem: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#F0F0F0',
  },
  quickEmoji: { fontSize: 28 },
  quickText: { fontSize: 12, color: '#555', fontWeight: '600' },
});