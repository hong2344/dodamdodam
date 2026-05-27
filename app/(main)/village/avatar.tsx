import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { getMyProfile } from '../../../lib/api/auth';

const CHARACTERS = [
  { id: 'cat', name: '고양이', image: require('../../../assets/cat.png') },
  { id: 'rabbit', name: '토끼', image: require('../../../assets/rabbit.png') },
  { id: 'bear', name: '곰', image: require('../../../assets/bear.png') },
  { id: 'frog', name: '개구리', image: require('../../../assets/frog.png') },
  { id: 'hedgehog', name: '고슴도치', image: require('../../../assets/hedgehog.png') },
  { id: 'dog', name: '강아지', image: require('../../../assets/dog.png') },
];

export default function AvatarScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [selected, setSelected] = useState('cat');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const p = await getMyProfile();
        setProfile(p);
        if (p?.avatar_type) setSelected(p.avatar_type);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('profiles').update({ avatar_type: selected }).eq('id', user.id);
      if (error) throw error;
      Alert.alert('저장됐어요!', '', [{ text: '확인', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#4A7C59" /></View>;

  const selectedChar = CHARACTERS.find(c => c.id === selected);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>←</Text>
      </TouchableOpacity>
      <Text style={styles.title}>캐릭터 선택</Text>
      <View style={styles.previewBox}>
        <Image source={selectedChar?.image} style={styles.previewImage} />
        <Text style={styles.previewName}>{selectedChar?.name}</Text>
        <Text style={styles.nickname}>{profile?.nickname}</Text>
      </View>
      <Text style={styles.sectionTitle}>캐릭터 선택</Text>
      <View style={styles.grid}>
        {CHARACTERS.map((char) => (
          <TouchableOpacity
            key={char.id}
            style={[styles.charCard, selected === char.id && styles.charCardSelected]}
            onPress={() => setSelected(char.id)}
          >
            <Image source={char.image} style={styles.charImage} />
            <Text style={[styles.charName, selected === char.id && styles.charNameSelected]}>{char.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={[styles.button, saving && styles.buttonDisabled]} onPress={handleSave} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? '저장 중...' : '선택 완료'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFAF6' },
  inner: { padding: 24, paddingTop: 60, gap: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  back: { marginBottom: 4 },
  backText: { fontSize: 22, color: '#4A7C59' },
  title: { fontSize: 24, fontWeight: '700', color: '#2C2C2C' },
  previewBox: { alignItems: 'center', gap: 8, paddingVertical: 16, backgroundColor: '#F0F7F2', borderRadius: 16 },
  previewImage: { width: 120, height: 120, borderRadius: 60 },
  previewName: { fontSize: 18, fontWeight: '700', color: '#2C2C2C' },
  nickname: { fontSize: 14, color: '#888' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2C2C2C' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  charCard: { width: '30%', backgroundColor: '#fff', borderRadius: 16, padding: 12, alignItems: 'center', gap: 8, borderWidth: 2, borderColor: '#E0E0E0' },
  charCardSelected: { borderColor: '#4A7C59', backgroundColor: '#F0F7F2' },
  charImage: { width: 70, height: 70, borderRadius: 35 },
  charName: { fontSize: 12, color: '#666', fontWeight: '600' },
  charNameSelected: { color: '#4A7C59' },
  button: { backgroundColor: '#4A7C59', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});