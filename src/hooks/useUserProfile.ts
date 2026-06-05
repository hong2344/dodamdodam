import { useState, useEffect, useCallback } from 'react';
import { supabase, Profile } from '../../lib/supabase';

type UserProfileData = Pick<Profile, 'avatar_type' | 'village_id' | 'house_x' | 'house_y'>;
type UpdateProfileInput = Partial<UserProfileData>;

interface UseUserProfileReturn {
  profile: UserProfileData | null;
  loading: boolean;
  error: string | null;
  updateProfile: (updates: UpdateProfileInput) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useUserProfile(): UseUserProfileReturn {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('avatar_type, village_id, house_x, house_y')
      .eq('id', userId)
      .single();

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setProfile(data);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Supabase Realtime: profiles 테이블 변경 감지
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`profile:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updated = payload.new as Profile;
            setProfile({
              avatar_type: updated.avatar_type,
              village_id: updated.village_id,
              house_x: updated.house_x,
              house_y: updated.house_y,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const updateProfile = useCallback(
    async (updates: UpdateProfileInput) => {
      if (!userId) throw new Error('로그인이 필요합니다.');

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (updateError) throw new Error(updateError.message);
      // Realtime 구독이 자동으로 상태를 갱신함
    },
    [userId]
  );

  return { profile, loading, error, updateProfile, refetch: fetchProfile };
}
