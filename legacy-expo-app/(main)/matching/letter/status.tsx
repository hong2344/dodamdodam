import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../../lib/supabase';
import { getDeliveryStatus, DeliveryStatus, Letter } from '../../../../lib/api/letters';
import { notify } from '../../../../lib/ui';

const STEPS = ['발송', '배달 중', '도착'];

export default function StatusScreen() {
  const router = useRouter();
  const [letters, setLetters] = useState<(Letter & { delivery?: DeliveryStatus })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('letters')
          .select('*')
          .eq('sender_id', user.id)
          .order('sent_at', { ascending: false });

        if (error) throw error;

        const withStatus = await Promise.all(
          (data ?? []).map(async (letter) => {
            try {
              const delivery = await getDeliveryStatus(letter.id);
              return { ...letter, delivery: delivery ?? undefined };
            } catch {
              return { ...letter, delivery: undefined };
            }
          }),
        );
        setLetters(withStatus);
      } catch (e: any) {
        notify('오류', e.message);
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
    <View style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>배달 현황</Text>

        {letters.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📮</Text>
            <Text style={styles.emptyText}>보낸 편지가 없어요</Text>
          </View>
        ) : (
          <FlatList
            data={letters}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const step = item.delivery?.current_step ?? 1;
              const remaining = item.delivery?.remaining_minutes ?? 0;
              return (
                <View style={styles.card}>
                  <Text style={styles.cardPreview} numberOfLines={1}>{item.content}</Text>
                  <View style={styles.steps}>
                    {STEPS.map((name, i) => (
                      <View key={name} style={styles.stepItem}>
                        <View style={[styles.stepDot, i + 1 <= step ? styles.stepDotActive : styles.stepDotInactive]}>
                          <Text style={styles.stepDotText}>{i + 1 <= step ? '✓' : String(i + 1)}</Text>
                        </View>
                        {i < STEPS.length - 1 && (
                          <View style={[styles.stepLine, i + 1 < step ? styles.stepLineActive : styles.stepLineInactive]} />
                        )}
                      </View>
                    ))}
                  </View>
                  <View style={styles.stepLabels}>
                    {STEPS.map((name, i) => (
                      <Text key={name} style={[styles.stepLabel, i + 1 === step && styles.stepLabelActive]}>{name}</Text>
                    ))}
                  </View>
                  {step < 3 && remaining > 0 && <Text style={styles.remaining}>약 {remaining}분 후 다음 단계</Text>}
                  {step === 3 && <Text style={styles.arrived}>도착 완료!</Text>}
                </View>
              );
            }}
          />
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
  back: { marginBottom: 8 },
  backText: { fontSize: 22, color: '#4A7C59' },
  title: { fontSize: 24, fontWeight: '700', color: '#2C2C2C', marginBottom: 20 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyEmoji: { fontSize: 64 },
  emptyText: { fontSize: 16, color: '#888' },
  list: { gap: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 12, borderWidth: 1, borderColor: '#F0F0F0' },
  cardPreview: { fontSize: 14, color: '#555' },
  steps: { flexDirection: 'row', alignItems: 'center' },
  stepItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepDot: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  stepDotActive: { backgroundColor: '#4A7C59' },
  stepDotInactive: { backgroundColor: '#E0E0E0' },
  stepDotText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  stepLine: { flex: 1, height: 2 },
  stepLineActive: { backgroundColor: '#4A7C59' },
  stepLineInactive: { backgroundColor: '#E0E0E0' },
  stepLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  stepLabel: { fontSize: 11, color: '#777', flex: 1, textAlign: 'center' },
  stepLabelActive: { color: '#4A7C59', fontWeight: '700' },
  remaining: { fontSize: 12, color: '#888', textAlign: 'center' },
  arrived: { fontSize: 13, color: '#4A7C59', fontWeight: '700', textAlign: 'center' },
});
