// app/(auth)/register/account.tsx
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { signUp } from '../../../lib/api/auth';
import { getVillages } from '../../../lib/api/villages';
import { useRegister } from './_context';
import StepHeader from './_components/StepHeader';

export default function AccountScreen() {
  const router = useRouter();
  const { data, reset } = useRegister();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [villageName, setVillageName] = useState('');

  // village_id로 마을 이름 찾기
  useEffect(() => {
    async function fetchVillageName() {
      if (!data.village_id) return;
      const villages = await getVillages();
      const found = villages.find((v) => v.id === data.village_id);
      if (found) setVillageName(found.name);
    }
    fetchVillageName();
  }, [data.village_id]);

  async function handleSignUp() {
    if (!email.trim()) {
      Alert.alert('알림', '이메일을 입력해주세요.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('알림', '비밀번호는 8자 이상이어야 해요.');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('알림', '비밀번호가 일치하지 않아요.');
      return;
    }

    try {
      setLoading(true);
      await signUp({
        email: email.trim(),
        password,
        phone_number: data.phone_number ?? '',
        real_name: data.real_name ?? '',
        age: data.age ?? 0,
        birth_date: data.birth_date ?? '',
        village_id: data.village_id ?? '',
        nickname: data.nickname ?? '',
        avatar_color: '#A8C5A0',
        avatar_type: 1,
      });

      reset();
      Alert.alert(
        '가입 완료! 🎉',
        '이메일 인증 후 로그인해주세요.',
        [{ text: '확인', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (e: any) {
      Alert.alert('가입 실패', e.message ?? '다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StepHeader step={5} total={5} title="계정 설정" />

      <View style={styles.inner}>
        <Text style={styles.desc}>로그인에 사용할{'\n'}이메일과 비밀번호를 설정해주세요.</Text>

        <TextInput
          style={styles.input}
          placeholder="이메일"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호 (8자 이상)"
          placeholderTextColor="#aaa"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호 확인"
          placeholderTextColor="#aaa"
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>가입 완료</Text>}
        </TouchableOpacity>

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>입력 정보 확인</Text>
          <Text style={styles.summaryItem}>📞 {data.phone_number}</Text>
          <Text style={styles.summaryItem}>👤 {data.real_name} ({data.age}세)</Text>
          <Text style={styles.summaryItem}>🏘 {villageName}</Text>
          <Text style={styles.summaryItem}>✉️ {data.nickname}</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFAF6' },
  inner: { flex: 1, paddingHorizontal: 32, paddingTop: 32, gap: 12 },
  desc: { fontSize: 15, color: '#666', lineHeight: 22, marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#2C2C2C',
  },
  button: {
    backgroundColor: '#4A7C59',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  summary: {
    marginTop: 16,
    backgroundColor: '#F0F7F2',
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: '#4A7C59', marginBottom: 4 },
  summaryItem: { fontSize: 13, color: '#555' },
});