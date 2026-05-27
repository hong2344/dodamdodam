import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

type Props = {
  step: number;
  total: number;
  title: string;
};

export default function StepHeader({ step, total, title }: Props) {
  const router = useRouter();
  const progress = step / total;

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { flex: progress }]} />
          <View style={{ flex: 1 - progress }} />
        </View>

        <Text style={styles.stepText}>{step} / {total}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: '#FDFAF6',
  },
  inner: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  back: { marginBottom: 16 },
  backText: { fontSize: 22, color: '#4A7C59' },
  progressBg: {
    flexDirection: 'row',
    height: 4,
    backgroundColor: '#E8E8E8',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: { backgroundColor: '#4A7C59' },
  stepText: { fontSize: 12, color: '#aaa', marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', color: '#2C2C2C' },
});
