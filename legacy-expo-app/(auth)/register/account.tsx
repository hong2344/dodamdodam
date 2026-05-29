import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useRegister } from './_context';
import StepHeader from './_components/StepHeader';
import { notify } from '../../../lib/ui';

export default function AccountScreen() {
  const router = useRouter();
  const { update } = useRegister();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  function handleNext() {
    if (!email.trim()) {
      notify('알림', '이메일을 입력해주세요.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      notify('알림', '올바른 이메일 형식이 아니에요.');
      return;
    }
    if (password.length < 8) {
      notify('알림', '비밀번호는 8자 이상이어야 해요.');
      return;
    }
    if (password !== passwordConfirm) {
      notify('알림', '비밀번호가 일치하지 않아요.');
      return;
    }

    update({ email: email.trim(), password });
    router.push('/(auth)/register/age');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StepHeader step={1} total={3} title="아이디 · 비밀번호 설정" />

      <View style={styles.inner}>
        <Text style={styles.desc}>
          로그인에 사용할 이메일과 비밀번호를 설정해주세요.
        </Text>

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

        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>다음</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFAF6' },
  inner: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 32,
    gap: 12,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
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
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
