import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getShopItems, getMyPoints, buyItem, ShopItem } from '../../../lib/api/shop';

const CATEGORIES = ['전체', 'avatar', 'paper', 'sticker'];
const CATEGORY_LABELS: Record<string, string> = {
  '전체': '전체', avatar: '아바타', paper: '편지지', sticker: '스티커',
};

export default function ShopScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [points, setPoints] = useState(0);
  const [category, setCategory] = useState('전체');
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => { load(); }, [category]);

  async function load() {
    try {
      setLoading(true);
      const [itemData, pointData] = await Promise.all([
        getShopItems(category === '전체' ? undefined : category),
        getMyPoints(),
      ]);
      setItems(itemData);
      setPoints(pointData);
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleBuy(item: ShopItem) {
    if ((points ?? 0) < (item.price ?? 0)) {
      Alert.alert('포인트 부족', '포인트가 부족해요.');
      return;
    }
    Alert.alert('구매 확인', `${item.name}을(를) ${item.price}P에 구매할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '구매',
        onPress: async () => {
          try {
            setBuying(item.id);
            await buyItem(item.id);
            setPoints((prev) => prev - (item.price ?? 0));
            Alert.alert('구매 완료! 🎉');
          } catch (e: any) {
            Alert.alert('오류', e.message);
          } finally {
            setBuying(null);
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>포인트샵</Text>
        <View style={styles.pointBadge}>
          <Text style={styles.pointText}>⭐ {points}P</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.tab, category === cat && styles.tabActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.tabText, category === cat && styles.tabTextActive]}>
              {CATEGORY_LABELS[cat]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#4A7C59" /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <View style={styles.itemImage}>
                <Text style={styles.itemEmoji}>
                  {item.category === 'avatar' ? '🧑' : item.category === 'paper' ? '📄' : '⭐'}
                </Text>
              </View>
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.itemPrice}>⭐ {item.price}P</Text>
              <TouchableOpacity
                style={[styles.buyButton, (points ?? 0) < (item.price ?? 0) && styles.buyButtonDisabled]}
                onPress={() => handleBuy(item)}
                disabled={buying === item.id}
              >
                {buying === item.id
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.buyButtonText}>구매</Text>}
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🛍</Text>
              <Text style={styles.emptyText}>아이템이 없어요</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFAF6', paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#2C2C2C' },
  pointBadge: { backgroundColor: '#F0F7F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  pointText: { fontSize: 14, color: '#4A7C59', fontWeight: '600' },
  tabs: { flexDirection: 'row', paddingHorizontal: 24, gap: 8, marginBottom: 16 },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F0F0F0' },
  tabActive: { backgroundColor: '#4A7C59' },
  tabText: { fontSize: 13, color: '#666' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: { gap: 12, marginBottom: 12 },
  itemCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: '#F0F0F0' },
  itemImage: { height: 80, backgroundColor: '#F8F8F8', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  itemEmoji: { fontSize: 40 },
  itemName: { fontSize: 14, fontWeight: '600', color: '#2C2C2C' },
  itemPrice: { fontSize: 13, color: '#4A7C59' },
  buyButton: { backgroundColor: '#4A7C59', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  buyButtonDisabled: { backgroundColor: '#E0E0E0' },
  buyButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 80 },
  emptyEmoji: { fontSize: 64 },
  emptyText: { fontSize: 16, color: '#888' },
});