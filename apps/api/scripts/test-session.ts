import { Request, Response } from 'express';
import { UserRole, AccountStatus, ModerationState } from '@mixmatch/types';
import { container } from '../src/config/di';
import { session } from '../src/domains/identity/auth.controller';
import { generateToken, verifyToken } from '../src/services/jwt.service';

async function runTest() {
  console.log('--- Starting manual test of /auth/session ---');

  // 1. Mock the repositories
  const mockUser = {
    id: 'user123',
    name: 'Test DJ',
    email: 'test@dj.com',
    role: UserRole.DJ,
    onboardingCompleted: false,
    accountStatus: AccountStatus.ACTIVE,
    moderationState: ModerationState.CLEAR,
    ageGatePassed: true,
    timezone: 'America/New_York',
    locale: 'en-US',
    visibilityPreference: 'PUBLIC',
    privacySettings: {
      blindListeningEligible: true,
      profileRevealAllowed: true,
      showOnlineStatus: true,
      allowDirectMessages: true,
      visibilityPreference: 'PUBLIC'
    },
    lastActiveAt: new Date(),
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date()
  };

  const mockWallets = [
    {
      id: 'wallet123',
      userId: 'user123',
      stellarAccountId: 'GDTEST123...',
      network: 'TESTNET',
      status: 'ACTIVE',
      keyProvenance: 'USER_GENERATED',
      featureEligibility: [],
      verifiedAt: new Date(),
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  container.userRepository.findById = async (id: string) => {
    if (id === 'user123') return mockUser as any;
    return null;
  };

  container.walletLinkageRepository.findByUserId = async (userId: string) => {
    if (userId === 'user123') return mockWallets as any;
    return [];
  };

  // 2. Generate a token and verify it to get the iat/exp
  process.env.JWT_SECRET = 'test-secret';
  const token = generateToken('user123', UserRole.DJ);
  const payload = verifyToken(token);

  console.log('Token Payload:', payload);

  // 3. Mock Request and Response
  const req = {
    user: {
      userId: payload.userId,
      role: payload.role,
      iat: payload.iat,
      exp: payload.exp
    },
    ip: '192.168.1.1',
    get: (header: string) => header === 'User-Agent' ? 'TestRunner/1.0' : undefined
  } as unknown as Request & { user: any };

  const res = {
    status: (code: number) => {
      console.log(`Response Status: ${code}`);
      return res;
    },
    json: (data: any) => {
      console.log('Response JSON:', JSON.stringify(data, null, 2));
      return res;
    }
  } as unknown as Response;

  // 4. Call the controller
  console.log('Calling session controller...');
  await session(req, res);
  console.log('--- Test Complete ---');
}

runTest().catch(console.error);
