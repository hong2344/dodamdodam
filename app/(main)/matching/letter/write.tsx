import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { sendLetter } from '../../../../lib/api/letters';
import { notify } from '../../../../lib/ui';

const PAPER_STYLES = [
  { id: 'default', emoji: '📄', label: '기본' },
  { id: 'warm', emoji: '🌤️', label: '따뜻한' },
  { id: 'cool', emoji: '🌊', label: '차분한' },
  { id: 'vintage', emoji: '🕰️', label: '빈티지' },
];

const STICKERS = ['🌷', '🪙', '🌼', '⭐', '🌧️', '🫶', '✨', '💌'];

export default function WriteLetterScreen() {
  const router = useRouter();
  const { matchId, receiverId } = useLocalSearchParams<{ matchId: string; receiverId: string }>();
  const [content, setContent] = useState('');
  const [paperStyle, setPaperStyle] = useState('default');
  const [sticker, setSticker] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (content.trim().length < 10) {
      notify('알림', '편지는 10자 이상 써주세요.');
      return;
    }
    if (!matchId || !receiverId) {
      notify('오류', '매칭 정보가 없어요.');
      return;
    }
    try {
      setLoading(true);
      await sendLetter({ matchId, receiverId, content: content.trim(), paperStyle, sticker: sticker ?? undefined });
      notify('편지를 보냈어요!', '배달 현황에서 확인할 수 있어요.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      notify('오류', e.message);
    } finally {
      setLoading(false);
    }
  }

  const paperBg: Record<string, string> = {
    default: '#FFFFF8',
    warm: '#FFF8E7',
    cool: '#EFF6FF',
    vintage: '#F5EFE6',
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>편지 쓰기</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>편지지</Text>
          <View style={styles.paperRow}>
            {PAPER_STYLES.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.paperCard, paperStyle === p.id && styles.paperCardSelected]}
                onPress={() => setPaperStyle(p.id)}
              >
                <Text style={styles.paperEmoji}>{p.emoji}</Text>
                <Text style={styles.paperLabel}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.letterBox, { backgroundColor: paperBg[paperStyle] }]}>
          <TextInput
            style={styles.letterInput}
            placeholder="마음을 담아 편지를 써보세요..."
            placeholderTextColor="#888"
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{content.length}/500</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>스티커 (선택)</Text>
          <View style={styles.stickerRow}>
            {STICKERS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.stickerBtn, sticker === s && styles.stickerBtnSelected]}
                onPress={() => setSticker(sticker === s ? null : s)}
              >
                <Text style={styles.stickerEmoji}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.sendButton, loading && styles.buttonDisabled]}
          onPress={handleSend}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendButtonText}>편지 보내기 📮</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFAF6' },
  inner: {
    padding: 24,
    paddingTop: 60,
    gap: 20,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  back: { marginBottom: 4 },
  backText: { fontSize: 22, color: '#4A7C59' },
  title: { fontSize: 24, fontWeight: '700', color: '#2C2C2C' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#2C2C2C' },
  paperRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paperCard: { flex: 1, minWidth: 120, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: '#E0E0E0' },
  paperCardSelected: { borderColor: '#4A7C59', backgroundColor: '#F0F7F2' },
  paperEmoji: { fontSize: 20 },
  paperLabel: { fontSize: 11, color: '#666' },
  letterBox: { borderRadius: 14, padding: 16, minHeight: 220, borderWidth: 1, borderColor: '#E8E8E0' },
  letterInput: { fontSize: 15, color: '#2C2C2C', lineHeight: 24, minHeight: 160, outlineStyle: 'none' as any },
  charCount: { fontSize: 12, color: '#777', textAlign: 'right', marginTop: 8 },
  stickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stickerBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#E0E0E0' },
  stickerBtnSelected: { borderColor: '#4A7C59', backgroundColor: '#F0F7F2' },
  stickerEmoji: { fontSize: 24 },
  sendButton: { backgroundColor: '#4A7C59', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  sendButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
