import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { getMyProfile } from '../../../lib/api/auth';

const CATEGORIES = [
  { id: 'career',       name: '진로',     emoji: '🌱', desc: '미래, 꿈, 진학 고민' },
  { id: 'grades',       name: '성적',     emoji: '📖', desc: '공부, 시험, 학업 스트레스' },
  { id: 'relationship', name: '인간관계', emoji: '🤝', desc: '친구, 가족, 선생님과의 관계' },
  { id: 'romance',      name: '연애',     emoji: '💌', desc: '설렘, 짝사랑, 이별' },
  { id: 'appearance',   name: '외모',     emoji: '✨', desc: '외모, 자기관리, 패션' },
  { id: 'melancholy',   name: '멜랑콜리', emoji: '🌙', desc: '불안, 우울, 정체성, 혼란' },
];

export default function CategoryScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCurrentCategory();
  }, []);

  async function loadCurrentCategory() {
    const profile = await getMyProfile();
    if (profile?.match_category) {
      setSelected(profile.match_category);
      setPrevious(profile.match_category);
    }
  }

  async function handleSave() {
    if (!selected) {
      Alert.alert('관심사를 선택해주세요');
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase
      .from('profiles')
      .update({ match_category: selected })
      .eq('id', user.id);

    setSaving(false);
    if (error) {
      Alert.alert('저장 실패', error.message);
      return;
    }
    Alert.alert('저장됐어요!', '이번 주 관심사가 설정됐어요.', [
      { text: '확인', onPress: () => router.back() },
    ]);
  }

  const previousCat = CATEGORIES.find(c => c.id === previous);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>관심사 변경</Text>
      <Text style={styles.subtitle}>
        어떤 이야기를 나누고 싶으세요?{'\n'}같은 고민을 가진 친구와 매칭돼요.
      </Text>

      {previousCat && previous !== selected && (
        <View style={styles.prevBox}>
          <Text style={styles.prevText}>
            현재 설정: {previousCat.emoji} {previousCat.name}
          </Text>
        </View>
      )}

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
            <Text style={[styles.desc, selected === cat.id && styles.descSelected]}>
              {cat.desc}
            </Text>
            {selected === cat.id && <Text style={styles.check}>✓</Text>}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, (!selected || saving) && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={!selected || saving}
      >
        <Text style={styles.buttonText}>{saving ? '저장 중...' : '저장하기'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFAF6' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#2C2C2C', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#666', lineHeight: 22, marginBottom: 20 },
  prevBox: {
    backgroundColor: '#F0F7F2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  prevText: { fontSize: 13, color: '#4A7C59' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 },
  card: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    gap: 4,
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
  cardSelected: { borderColor: '#4A7C59', backgroundColor: '#F0F7F2' },
  emoji: { fontSize: 32, marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '700', color: '#2C2C2C' },
  nameSelected: { color: '#4A7C59' },
  desc: { fontSize: 11, color: '#aaa', lineHeight: 16 },
  descSelected: { color: '#6BA882' },
  check: { fontSize: 14, color: '#4A7C59', fontWeight: '700', marginTop: 4 },
  button: {
    backgroundColor: '#4A7C59',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
