import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getInbox, markAsRead, Letter } from '../../../../lib/api/letters';
import { notify } from '../../../../lib/ui';

export default function InboxScreen() {
  const router = useRouter();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getInbox();
        setLetters(data);
      } catch (e: any) {
        notify('오류', e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleRead(letter: Letter) {
    if (!letter.is_read) {
      await markAsRead(letter.id);
      setLetters((prev) =>
        prev.map((l) => l.id === letter.id ? { ...l, is_read: true } : l),
      );
    }
    notify('편지 내용', letter.content);
  }

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
        <Text style={styles.title}>받은 편지함</Text>

        {letters.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>아직 받은 편지가 없어요</Text>
          </View>
        ) : (
          <FlatList
            data={letters}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.letterCard, !item.is_read && styles.letterCardUnread]}
                onPress={() => handleRead(item)}
              >
                <View style={styles.letterHeader}>
                  <Text style={styles.letterEmoji}>{item.is_read ? '📄' : '📮'}</Text>
                  {!item.is_read && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.letterPreview} numberOfLines={2}>{item.content}</Text>
                <Text style={styles.letterDate}>
                  {item.sent_at ? new Date(item.sent_at).toLocaleDateString('ko-KR') : ''}
                </Text>
              </TouchableOpacity>
            )}
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
  list: { gap: 12 },
  letterCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 8, borderWidth: 1, borderColor: '#F0F0F0' },
  letterCardUnread: { borderColor: '#4A7C59', backgroundColor: '#F0F7F2' },
  letterHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  letterEmoji: { fontSize: 24 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4A7C59' },
  letterPreview: { fontSize: 14, color: '#555', lineHeight: 20 },
  letterDate: { fontSize: 12, color: '#777' },
});
