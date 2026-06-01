import { NextRequest, NextResponse } from 'next/server';
import type { LoginRequest } from '@stella/types/auth';
import { login } from '@/lib/auth/auth.service';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<LoginRequest>;

  if (!body.email || !body.password) {
    return NextResponse.json(
      { error: 'INVALID_CREDENTIALS', message: 'Email and password are required.' },
      { status: 400 },
    );
  }

  const ip        = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const userAgent = req.headers.get('user-agent');

  const result = await login(
    { email: body.email, password: body.password, sessionId: body.sessionId },
    { ip, userAgent },
  );

  const status = result.success
    ? 200
    : result.error === 'RATE_LIMITED' || result.error === 'COOLDOWN_ACTIVE'
    ? 429
    : 401;

  return NextResponse.json(result, { status });
}
