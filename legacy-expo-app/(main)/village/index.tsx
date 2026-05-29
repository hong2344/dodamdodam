import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  Animated, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { getMyProfile } from '../../../lib/api/auth';
import { getCharacter } from '../../../lib/appData';
import { notify } from '../../../lib/ui';

const BUILDINGS = [
  { id: 'post', name: '우체국', emoji: '📮', x: 0.25, y: 0.45 },
  { id: 'plaza', name: '광장', emoji: '🏛️', x: 0.5, y: 0.6 },
  { id: 'home', name: '내 집', emoji: '🏠', x: 0.75, y: 0.45 },
];

export default function VillageScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const mapWidth = Math.min(width, 960);
  const mapHeight = Math.max(height, 640);
  const mapLeft = (width - mapWidth) / 2;
  const [profile, setProfile] = useState<any>(null);
  const [otherUsers, setOtherUsers] = useState<any[]>([]);

  const avatarX = useRef(new Animated.Value(mapWidth * 0.5)).current;
  const avatarY = useRef(new Animated.Value(mapHeight * 0.5)).current;

  useEffect(() => {
    loadProfile();
    const cleanup = subscribeToUsers();
    return cleanup;
  }, []);

  async function loadProfile() {
    try {
      const p = await getMyProfile();
      setProfile(p);
      if (p) {
        await supabase.from('profiles').update({
          house_x: 0.5,
          house_y: 0.5,
        }).eq('id', p.id);
      }
    } catch (e: any) {
      notify('오류', e.message);
    }
  }

  function subscribeToUsers() {
    const channel = supabase
      .channel('village')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
      }, () => {
        loadOtherUsers();
      })
      .subscribe();

    loadOtherUsers();
    return () => {
      supabase.removeChannel(channel);
    };
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

    if (profile) {
      supabase.from('profiles').update({
        house_x: locationX / mapWidth,
        house_y: locationY / mapHeight,
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

  const myCharImage = getCharacter(profile?.avatar_type).image;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={1}
        style={[styles.map, { width: mapWidth, height: mapHeight, left: mapLeft }]}
        onPress={handleMapPress}
      >
        <Image
          source={require('../../../assets/village.png')}
          style={[styles.mapImage, { width: mapWidth, height: mapHeight }]}
          resizeMode="cover"
        />

        {BUILDINGS.map((b) => (
          <TouchableOpacity
            key={b.id}
            style={[styles.building, {
              left: mapWidth * b.x - 30,
              top: mapHeight * b.y - 30,
            }]}
            onPress={() => handleBuildingPress(b)}
          >
            <Text style={styles.buildingEmoji}>{b.emoji}</Text>
            <Text style={styles.buildingName}>{b.name}</Text>
          </TouchableOpacity>
        ))}

        {otherUsers.map((u) => (
          <View
            key={u.id}
            style={[styles.otherAvatar, {
              left: (u.house_x ?? 0.3) * mapWidth - 20,
              top: (u.house_y ?? 0.3) * mapHeight - 20,
            }]}
          >
            <Image
              source={getCharacter(u.avatar_type).image}
              style={styles.charImage}
            />
            <Text style={styles.avatarName}>{u.nickname}</Text>
          </View>
        ))}

        <Animated.View style={[styles.myAvatar, {
          left: Animated.subtract(avatarX, 20),
          top: Animated.subtract(avatarY, 20),
        }]}
        >
          <Image source={myCharImage} style={styles.charImage} />
          <Text style={styles.myAvatarName}>{profile?.nickname ?? '나'}</Text>
        </Animated.View>
      </TouchableOpacity>

      <View style={styles.hud}>
        <View style={styles.hudLeft}>
          <Text style={styles.hudNickname}>{profile?.nickname ?? '도담이'}</Text>
          <Text style={styles.hudPoints}>🪙 {profile?.points ?? 0}P</Text>
        </View>
        <View style={styles.hudRight}>
          <TouchableOpacity
            style={styles.hudButton}
            onPress={() => router.push('/(main)/matching/letter/inbox')}
          >
            <Text style={styles.hudButtonText}>📬 편지</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.hudButton}
            onPress={() => router.push('/(main)/village/avatar')}
          >
            <Text style={styles.hudButtonText}>🎨 꾸미기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#DDEFD7', overflow: 'hidden' },
  map: { flex: 1, position: 'absolute' },
  mapImage: { position: 'absolute' },
  building: {
    position: 'absolute',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 6,
    minWidth: 64,
  },
  buildingEmoji: { fontSize: 28 },
  buildingName: { fontSize: 10, color: '#333', fontWeight: '600' },
  otherAvatar: { position: 'absolute', alignItems: 'center' },
  myAvatar: { position: 'absolute', alignItems: 'center' },
  charImage: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#fff' },
  avatarName: { fontSize: 10, color: '#333', backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 4, borderRadius: 4, marginTop: 2 },
  myAvatarName: { fontSize: 10, color: '#4A7C59', fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 4, borderRadius: 4, marginTop: 2 },
  hud: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  hudLeft: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    padding: 10,
  },
  hudNickname: { fontSize: 14, fontWeight: '700', color: '#2C2C2C' },
  hudPoints: { fontSize: 12, color: '#4A7C59' },
  hudRight: { gap: 8 },
  hudButton: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    padding: 10,
  },
  hudButtonText: { fontSize: 13, fontWeight: '600', color: '#2C2C2C' },
});
