import { NextResponse } from 'next/server'

// GET /api/letters?type=received|sent
export async function GET() {
  // TODO: 편지 목록 조회
  return NextResponse.json({ letters: [] })
}

// POST /api/letters
export async function POST() {
  // TODO: 편지 전송
  return NextResponse.json({ ok: true })
}
