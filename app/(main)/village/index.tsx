import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  Animated, Dimensions, PanResponder, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { getMyProfile } from '../../../lib/api/auth';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// 건물 위치 (배경 이미지 기준 %)
const BUILDINGS = [
  { id: 'post', name: '우체국', emoji: '📮', x: 0.25, y: 0.45 },
  { id: 'plaza', name: '광장', emoji: '🏛', x: 0.5, y: 0.6 },
  { id: 'home', name: '내 집', emoji: '🏠', x: 0.75, y: 0.45 },
];

export default function VillageScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [otherUsers, setOtherUsers] = useState<any[]>([]);

  // 내 아바타 위치
  const avatarX = useRef(new Animated.Value(SCREEN_W * 0.5)).current;
  const avatarY = useRef(new Animated.Value(SCREEN_H * 0.5)).current;

  useEffect(() => {
    loadProfile();
    subscribeToUsers();
  }, []);

  async function loadProfile() {
    const p = await getMyProfile();
    setProfile(p);

    // 내 위치 Supabase에 업데이트
    if (p) {
      await supabase.from('profiles').update({
        house_x: 0.5,
        house_y: 0.5,
      }).eq('id', p.id);
    }
  }

  function subscribeToUsers() {
    // 다른 유저 실시간 구독
    const channel = supabase
      .channel('village')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
      }, (payload) => {
        loadOtherUsers();
      })
      .subscribe();

    loadOtherUsers();
    return () => supabase.removeChannel(channel);
  }

  async function loadOtherUsers() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_color, avatar_type, house_x, house_y')
      .neq('id', user.id)
      .not('house_x', 'is', null);

    setOtherUsers(data ?? []);
  }

  // 터치한 곳으로 아바타 이동
  function handleMapPress(e: any) {
    const { locationX, locationY } = e.nativeEvent;

    Animated.timing(avatarX, {
      toValue: locationX,
      duration: 500,
      useNativeDriver: false,
    }).start();

    Animated.timing(avatarY, {
      toValue: locationY,
      duration: 500,
      useNativeDriver: false,
    }).start();

    // 위치 업데이트
    if (profile) {
      supabase.from('profiles').update({
        house_x: locationX / SCREEN_W,
        house_y: locationY / SCREEN_H,
      }).eq('id', profile.id);
    }
  }

  function handleBuildingPress(building: typeof BUILDINGS[0]) {
    if (building.id === 'post') {
      router.push('/(main)/matching');
    } else if (building.id === 'plaza') {
      router.push('/(main)/shop');
    } else if (building.id === 'home') {
      router.push('/(main)/village/avatar');
    }
  }

  return (
    <View style={styles.container}>
      {/* 마을 배경 */}
      <TouchableOpacity
        activeOpacity={1}
        style={styles.map}
        onPress={handleMapPress}
      >
        <Image
          source={require('../../../assets/village.png')}
          style={styles.mapImage}
          resizeMode="cover"
        />

        {/* 건물들 */}
        {BUILDINGS.map((b) => (
          <TouchableOpacity
            key={b.id}
            style={[styles.building, {
              left: SCREEN_W * b.x - 30,
              top: SCREEN_H * b.y - 30,
            }]}
            onPress={() => handleBuildingPress(b)}
          >
            <Text style={styles.buildingEmoji}>{b.emoji}</Text>
            <Text style={styles.buildingName}>{b.name}</Text>
          </TouchableOpacity>
        ))}

        {/* 다른 유저 아바타들 */}
        {otherUsers.map((u) => (
          <View
            key={u.id}
            style={[styles.otherAvatar, {
              left: (u.house_x ?? 0.3) * SCREEN_W - 20,
              top: (u.house_y ?? 0.3) * SCREEN_H - 20,
            }]}
          >
            <View style={[styles.avatarCircle, { backgroundColor: u.avatar_color ?? '#A8C5A0' }]}>
              <Text style={styles.avatarEmoji}>🧑</Text>
            </View>
            <Text style={styles.avatarName}>{u.nickname}</Text>
          </View>
        ))}

        {/* 내 아바타 */}
        <Animated.View style={[styles.myAvatar, {
          left: Animated.subtract(avatarX, 20),
          top: Animated.subtract(avatarY, 20),
        }]}>
          <View style={[styles.avatarCircle, { backgroundColor: profile?.avatar_color ?? '#4A7C59' }]}>
            <Text style={styles.avatarEmoji}>🧑</Text>
          </View>
          <Text style={styles.myAvatarName}>{profile?.nickname ?? '나'}</Text>
        </Animated.View>
      </TouchableOpacity>

      {/* 상단 HUD */}
      <View style={styles.hud}>
        <View style={styles.hudLeft}>
          <Text style={styles.hudNickname}>{profile?.nickname}</Text>
          <Text style={styles.hudPoints}>⭐ {profile?.points ?? 0}P</Text>
        </View>
        <View style={styles.hudRight}>
          <TouchableOpacity
            style={styles.hudButton}
            onPress={() => router.push('/(main)/matching/letter/inbox')}
          >
            <Text style={styles.hudButtonText}>📥 편지</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  mapImage: { width: SCREEN_W, height: SCREEN_H, position: 'absolute' },
  building: {
    position: 'absolute',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
    padding: 6,
  },
  buildingEmoji: { fontSize: 28 },
  buildingName: { fontSize: 10, color: '#333', fontWeight: '600' },
  otherAvatar: { position: 'absolute', alignItems: 'center' },
  myAvatar: { position: 'absolute', alignItems: 'center' },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  avatarEmoji: { fontSize: 20 },
  avatarName: { fontSize: 10, color: '#333', backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 4, borderRadius: 4 },
  myAvatarName: { fontSize: 10, color: '#4A7C59', fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 4, borderRadius: 4 },
  hud: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hudLeft: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 10,
  },
  hudNickname: { fontSize: 14, fontWeight: '700', color: '#2C2C2C' },
  hudPoints: { fontSize: 12, color: '#4A7C59' },
  hudRight: { gap: 8 },
  hudButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 10,
  },
  hudButtonText: { fontSize: 13, fontWeight: '600', color: '#2C2C2C' },
});