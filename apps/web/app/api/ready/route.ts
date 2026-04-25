import { NextResponse } from 'next/server';

export function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    return NextResponse.json({ status: 'not ready', reason: 'NEXT_PUBLIC_API_URL not set' }, { status: 503 });
  }
  return NextResponse.json({ status: 'ready' });
}
