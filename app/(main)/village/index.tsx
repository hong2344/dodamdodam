import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getMyMatch, requestMatch, getMatchPartner, Match } from '../../../lib/api/matches';

export default function MatchingScreen() {
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);

  useEffect(() => {
    loadMatch();
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
      Alert.alert('오류', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestMatch() {
    try {
      setMatching(true);
      const partnerId = await requestMatch();
      if (!partnerId) {
        Alert.alert('알림', '지금은 매칭 상대가 없어요. 잠시 후 다시 시도해주세요.');
        return;
      }
      await loadMatch();
    } catch (e: any) {
      Alert.alert('매칭 실패', e.message);
    } finally {
      setMatching(false);
    }
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color="#4A7C59" />
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>편지 매칭</Text>

      {!match ? (
        <View style={styles.waitBox}>
          <Text style={styles.waitEmoji}>📮</Text>
          <Text style={styles.waitTitle}>아직 매칭된 이웃이 없어요</Text>
          <Text style={styles.waitDesc}>버튼을 누르면 편지를 나눌{'\n'}이웃을 찾아드릴게요!</Text>
          <TouchableOpacity
            style={[styles.matchButton, matching && styles.buttonDisabled]}
            onPress={handleRequestMatch}
            disabled={matching}
          >
            {matching
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.matchButtonText}>이웃 찾기</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.matchedBox}>
          <Text style={styles.matchedEmoji}>🎉</Text>
          <Text style={styles.matchedTitle}>이웃을 찾았어요!</Text>
          <View style={styles.partnerCard}>
            <View style={[styles.partnerAvatar, { backgroundColor: partner?.avatar_color ?? '#A8C5A0' }]}>
              <Text style={styles.partnerAvatarEmoji}>🧑</Text>
            </View>
            <View>
              <Text style={styles.partnerNickname}>{partner?.nickname ?? '???'}</Text>
              <Text style={styles.partnerInfo}>{partner?.location} · {partner?.age}세</Text>
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
              <Text style={styles.actionEmoji}>✏️</Text>
              <Text style={styles.actionText}>편지 쓰기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(main)/matching/letter/inbox')}
            >
              <Text style={styles.actionEmoji}>📥</Text>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFAF6', padding: 24, paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#2C2C2C', marginBottom: 32 },
  waitBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  waitEmoji: { fontSize: 80 },
  waitTitle: { fontSize: 20, fontWeight: '700', color: '#2C2C2C' },
  waitDesc: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 24 },
  matchButton: { backgroundColor: '#4A7C59', borderRadius: 12, paddingVertical: 15, paddingHorizontal: 40, marginTop: 16 },
  buttonDisabled: { opacity: 0.6 },
  matchButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  matchedBox: { flex: 1, alignItems: 'center', gap: 20 },
  matchedEmoji: { fontSize: 60 },
  matchedTitle: { fontSize: 22, fontWeight: '700', color: '#2C2C2C' },
  partnerCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, width: '100%', borderWidth: 1.5, borderColor: '#4A7C59' },
  partnerAvatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  partnerAvatarEmoji: { fontSize: 28 },
  partnerNickname: { fontSize: 18, fontWeight: '700', color: '#2C2C2C' },
  partnerInfo: { fontSize: 13, color: '#888', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 12, width: '100%' },
  actionButton: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#F0F0F0' },
  actionEmoji: { fontSize: 28 },
  actionText: { fontSize: 12, color: '#555', fontWeight: '600' },
  weekInfo: { fontSize: 12, color: '#aaa' },
});