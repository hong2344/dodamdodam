import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { signUp } from '../../../lib/api/auth';
import { useRegister } from './_context';
import StepHeader from './_components/StepHeader';
import { CATEGORIES } from '../../../lib/appData';
import { notify } from '../../../lib/ui';

export default function InterestScreen() {
  const router = useRouter();
  const { data, update, reset } = useRegister();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleComplete() {
    if (!selected) {
      notify('알림', '관심사를 선택해주세요.');
      return;
    }

    update({ match_category: selected });

    try {
      setLoading(true);
      await signUp({
        email: data.email ?? '',
        password: data.password ?? '',
        birth_date: data.birth_date ?? '',
        age: data.age ?? 14,
        nickname: data.nickname ?? '',
        match_category: selected,
      });
      reset();
      notify('가입 완료!', '이메일 인증 후 로그인해주세요.', [
        { text: '확인', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (e: any) {
      notify('가입 실패', e.message ?? '다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StepHeader step={3} total={3} title="관심사 선택" />

      <View style={styles.inner}>
        <Text style={styles.desc}>
          어떤 이야기를 나누고 싶으세요?{'\n'}
          비슷한 고민을 가진 친구와 편지를 나눌 수 있어요.
        </Text>

        <View style={styles.grid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.card, selected === cat.id && styles.cardSelected]}
              onPress={() => setSelected(cat.id)}
            >
              <Text style={styles.emoji}>{cat.emoji}</Text>
              <Text style={[styles.name, selected === cat.id && styles.nameSelected]}>
                {cat.name}
              </Text>
              <Text style={[styles.catDesc, selected === cat.id && styles.catDescSelected]}>
                {cat.desc}
              </Text>
              {selected === cat.id && <Text style={styles.check}>선택됨</Text>}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, (!selected || loading) && styles.buttonDisabled]}
          onPress={handleComplete}
          disabled={!selected || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>가입 완료</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFAF6' },
  content: { paddingBottom: 40 },
  inner: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 16,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  desc: { fontSize: 15, color: '#666', lineHeight: 24, marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '47%',
    minWidth: 160,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    gap: 4,
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
  cardSelected: {
    borderColor: '#4A7C59',
    backgroundColor: '#F0F7F2',
  },
  emoji: { fontSize: 32, marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '700', color: '#2C2C2C' },
  nameSelected: { color: '#4A7C59' },
  catDesc: { fontSize: 11, color: '#777', lineHeight: 16 },
  catDescSelected: { color: '#4A7C59' },
  check: { fontSize: 12, color: '#4A7C59', fontWeight: '700', marginTop: 4 },
  button: {
    backgroundColor: '#4A7C59',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
