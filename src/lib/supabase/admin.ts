import { createClient } from '@supabase/supabase-js'

// 서버 전용 Supabase 클라이언트 (service_role 키 사용 → RLS 우회).
// 절대 클라이언트 컴포넌트에서 import 하지 말 것. 크론/서버 라우트 전용.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY 또는 NEXT_PUBLIC_SUPABASE_URL 환경변수가 없습니다.')
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
