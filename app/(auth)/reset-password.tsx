import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { sendPasswordResetEmail } from '../../lib/api/auth';
import { notify } from '../../lib/ui';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!email.trim()) {
      notify('알림', '이메일을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(email.trim());
      notify('메일을 보냈어요', '비밀번호 재설정 링크를 확인해주세요.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      notify('오류', e.message);
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
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>비밀번호 재설정</Text>
        <Text style={styles.desc}>가입한 이메일로 재설정 링크를 보내드릴게요.</Text>
        <TextInput
          style={styles.input}
          placeholder="이메일"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleReset}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>재설정 메일 보내기</Text>}
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
    paddingTop: 60,
    gap: 12,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  back: { marginBottom: 12 },
  backText: { fontSize: 22, color: '#4A7C59' },
  title: { fontSize: 24, fontWeight: '700', color: '#2C2C2C' },
  desc: { fontSize: 14, color: '#666', lineHeight: 22, marginBottom: 8 },
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
