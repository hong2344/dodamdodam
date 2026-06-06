import type { SupabaseClient, User } from '@supabase/supabase-js'

export async function ensureProfileForUser(supabase: SupabaseClient, user: User) {
  const { data: profile, error: selectError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (selectError) {
    throw new Error(selectError.message)
  }

  if (profile) {
    return
  }

  const displayName =
    user.user_metadata?.name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.preferred_username ||
    user.email?.split('@')[0] ||
    '카카오 사용자'

  const { error: upsertError } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      nickname: displayName,
      created_at: new Date().toISOString(),
    },
    {
      onConflict: 'id',
      ignoreDuplicates: true,
    }
  )

  if (upsertError) {
    throw new Error(upsertError.message)
  }
}
