import { NextResponse } from 'next/server'

// GET /api/letters/:id
export async function GET() {
  // TODO: 편지 읽기 + readAt 업데이트
  return NextResponse.json({ letter: null })
}
