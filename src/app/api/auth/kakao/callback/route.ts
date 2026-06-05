import { NextResponse } from 'next/server'

// GET /api/auth/kakao/callback
export async function GET() {
  // TODO: 카카오 OAuth 처리
  return NextResponse.redirect('/')
}
