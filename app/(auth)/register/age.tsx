import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useRegister } from './_context';
import StepHeader from './_components/StepHeader';

export default function AgeScreen() {
  const router = useRouter();
  const { data, update, reset } = useRegister();

  const [birthDate, setBirthDate] = useState('');
  const [nickname, setNickname] = useState('');
  function calcAge(yyyymmdd: string): number {
    const today = new Date();
    const y = parseInt(yyyymmdd.slice(0, 4), 10);
    const m = parseInt(yyyymmdd.slice(4, 6), 10) - 1;
    const d = parseInt(yyyymmdd.slice(6, 8), 10);
    let age = today.getFullYear() - y;
    if (
      today.getMonth() < m ||
      (today.getMonth() === m && today.getDate() < d)
    ) age--;
    return age;
  }

  function handleNext() {
    const cleaned = birthDate.replace(/\D/g, '');
    if (cleaned.length !== 8) {
      Alert.alert('알림', '생년월일 8자리를 입력해주세요. (예: 19990101)');
      return;
    }
    if (!nickname.trim()) {
      Alert.alert('알림', '닉네임을 입력해주세요.');
      return;
    }
    const age = calcAge(cleaned);
    if (age < 14) {
      Alert.alert('알림', '만 14세 이상만 가입할 수 있어요.');
      return;
    }
    const isoDate = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
    update({ birth_date: isoDate, age, nickname: nickname.trim() });
    router.push('/(auth)/register/interest');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StepHeader step={2} total={3} title="나이 인증" />

      <View style={styles.inner}>
        <Text style={styles.desc}>생년월일과 닉네임을 입력해주세요.</Text>

        <TextInput
          style={styles.input}
          placeholder="생년월일 8자리 (예: 19990101)"
          placeholderTextColor="#aaa"
          value={birthDate}
          onChangeText={setBirthDate}
          keyboardType="numeric"
          maxLength={8}
        />
        <TextInput
          style={styles.input}
          placeholder="닉네임"
          placeholderTextColor="#aaa"
          value={nickname}
          onChangeText={setNickname}
          maxLength={12}
        />

        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>다음</Text>
        </TouchableOpacity>
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
});
