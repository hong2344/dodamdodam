import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native';
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
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_type: selected })
        .eq('id', user.id);
      if (error) throw error;
      Alert.alert('저장됐어요!', '', [{ text: '확인', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color="#4A7C59" />
    </View>
  );

  const selectedChar = CHARACTERS.find(c => c.id === selected);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>←</Text>
      </TouchableOpacity>
      <Text style={styles.title}>캐릭터 선택</Text>

      {/* 선택된 캐릭터 미리보기 */}
      <View style={styles.previewBox}>
        <Image source={selectedChar?.image} style={styles.previewImage} />
        <Text style={styles.previewName}>{selectedChar?.name}</Text>
        <Text style={styles.nickname}>{profile?.nickname}</Text>
      </View>

      {/* 캐릭터 선택 그리드 */}
      <Text style={styles.sectionTitle}>캐릭터 선택</Text>
      <View style={styles.grid}>
        {CHARACTERS.map((char) => (
          <TouchableOpacity
            key={char.id}
            style={[styles.charCard, selected === char.id && styles.charCardSelected]}
            onPress={() => setSelected(char.id)}
          >
            <Image source={char.image} style={styles.charImage} />
            <Text style={[styles.charName, selected === char.id && styles.charNameSelected]}>
              {char.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={