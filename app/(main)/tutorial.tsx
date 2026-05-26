import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '🏘',
    title: '마을에 오신 걸 환영해요',
    desc: '익명의 이웃과 편지를 주고받는\n따뜻한 마을이에요.',
  },
  {
    emoji: '✉️',
    title: '매칭되면 편지가 시작돼요',
    desc: '매칭된 상대에게 마음을 담은\n편지를 써보세요.',
  },
  {
    emoji: '📬',
    title: '편지는 시간이 걸려요',
    desc: '발송 → 배달중 → 도착\n실제 편지처럼 기다리는 설렘을 느껴보세요.',
  },
  {
    emoji: '🎁',
    title: '포인트로 꾸며요',
    desc: '편지를 주고받으면 포인트를 얻어\n아바타와 편지지를 꾸밀 수 있어요.',
  },
];

export default function TutorialScreen() {
  const router = useRouter();
  const [page, setPage] = useState(0);

  function handleNext() {
    if (page < SLIDES.length - 1) {
      setPage(page + 1);
    } else {
      router.replace('/(main)/village');
    }
  }

  const slide = SLIDES[page];

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skip} onPress={() => router.replace('/(main)/village')}>
        <Text style={styles.skipText}>건너뛰기</Text>
      </TouchableOpacity>

      <View style={styles.slide}>
        <Text style={styles.emoji}>{slide.emoji}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.desc}>{slide.desc}</Text>
      </View>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>
          {page === SLIDES.length - 1 ? '시작하기' : '다음'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFAF6', paddingHorizontal: 32 },
  skip: { paddingTop: 60, alignItems: 'flex-end' },
  skipText: { color: '#aaa', fontSize: 14 },
  slide: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  emoji: { fontSize: 80 },
  title: { fontSize: 24, fontWeight: '700', color: '#2C2C2C', textAlign: 'center' },
  desc: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0E0E0' },
  dotActive: { backgroundColor: '#4A7C59', width: 24 },
  button: {
    backgroundColor: '#4A7C59',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 48,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});