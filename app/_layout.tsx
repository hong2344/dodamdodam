import { useEffect } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'

export default function RootLayout() {
  const { session, setSession, isLoading, setIsLoading } = useAuthStore()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (isLoading) return

    const inAuth = segments[0] === '(auth)'

    if (!session && !inAuth) router.replace('/(auth)/login')
    if (session && inAuth) router.replace('/(main)')
  }, [session, isLoading])

  return <Slot />
}