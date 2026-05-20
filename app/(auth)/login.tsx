import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { signIn } from '../../lib/api/auth';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [failCount, setFailCount] = useState(0);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('알림', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    try {
      setLoading(true);
      await signIn(email.trim(), password);
      router.replace('/(main)/village');
    } catch (e: any) {
      // 실패 횟수 DB에 기록
      const { data } = await supabase.rpc('record_login_failure', {
        p_username: email.trim(),
      });

      const newCount = (data as number) ?? failCount + 1;
      setFailCount(newCount);

      if (newCount >= 5) {
        Alert.alert(
          '로그인 5회 실패',
          '비밀번호 재설정이 필요해요.',
          [{ text: '비밀번호 재설정', onPress: () => router.push('/(auth)/reset-password') }]
        );
      } else {
        Alert.alert(
          '로그인 실패',
          `아이디나 비밀번호를 확인해주세요.\n(${newCount}회 실패 / 5회 초과 시 재설정 필요)`
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>편지 마을</Text>
        <Text style={styles.subtitle}>익명으로 마음을 전해보세요</Text>

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
          placeholder="비밀번호"
          placeholderTextColor="#aaa"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* 실패 횟수 표시 */}
        {failCount > 0 && (
          <View style={styles.failBox}>
            <Text style={styles.failText}>
              {failCount}회 실패 · 5회 초과 시 비밀번호 재설정 필요
            </Text>
            <View style={styles.failBar}>
              {[1,2,3,4,5].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.failDot,
                    i <= failCount ? styles.failDotActive : styles.failDotInactive,
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>로그인</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/reset-password')}>
          <Text style={styles.link}>비밀번호를 잊으셨나요?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => router.push('/(auth)/register/phone')}
        >
          <Text style={styles.registerText}>처음이신가요? <Text style={styles.registerAccent}>회원가입</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFAF6' },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2C2C2C',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
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
  failBox: {
    backgroundColor: '#FFF3F3',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  failText: { fontSize: 13, color: '#E05252', textAlign: 'center' },
  failBar: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  failDot: { width: 10, height: 10, borderRadius: 5 },
  failDotActive: { backgroundColor: '#E05252' },
  failDotInactive: { backgroundColor: '#E0E0E0' },
  button: {
    backgroundColor: '#4A7C59',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: {
    textAlign: 'center',
    color: '#888',
    fontSize: 13,
    marginTop: 4,
  },
  registerButton: { marginTop: 16, alignItems: 'center' },
  registerText: { fontSize: 14, color: '#888' },
  registerAccent: { color: '#4A7C59', fontWeight: '600' },
});