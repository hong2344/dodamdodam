'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { supabase } from '@lib/supabase';
import { useAuthStore } from '@store/authStore';

const AUTH_PATHS = ['/login', '/register', '/reset-password'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { session, setSession, isLoading, setIsLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, [setIsLoading, setSession]);

  useEffect(() => {
    if (isLoading) return;

    const inAuth = AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
    if (!session && !inAuth) router.replace('/login');
    if (session && inAuth) router.replace('/village');
  }, [isLoading, pathname, router, session]);

  if (isLoading) return <div className="loading">불러오는 중...</div>;

  return children;
}
