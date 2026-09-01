import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EscrowController } from './escrow.controller';
import { EscrowService, EscrowFailedError } from './escrow.service';
import type { EscrowRecord } from './escrow.repository';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Stub out guards so tests skip auth entirely
jest.mock('../auth/jwt-auth.guard', () => ({
  JwtAuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: () => true,
  })),
}));

jest.mock('../auth/current-user.decorator', () => ({
  CurrentUserId: () => (_target: unknown, _propertyKey: string, _parameterIndex: number) => {},
}));

describe('EscrowController', () => {
  let module: TestingModule;
  let controller: EscrowController;
  let escrowService: jest.Mocked<EscrowService>;

  const ESCROW: EscrowRecord = {
    id: 'escrow-1',
    idempotencyKey: 'key-1',
    payerStellarAccountId: 'account-1',
    payeePublicKey: 'GPAYEE',
    tokenContractId: 'CTOKEN',
    amount: '5000000',
    onChainEscrowId: '7',
    timeoutLedger: 999,
    status: 'LOCKED',
    depositTxHash: 'deposit-hash',
    finalizeTxHash: null,
    failureCode: null,
    failureReason: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeAll(async () => {
    const mockEscrowService = {
      depositForUser: jest.fn(),
      getEscrowForUser: jest.fn(),
      releaseForUser: jest.fn(),
      refundForUser: jest.fn(),
    };

    module = await Test.createTestingModule({
      controllers: [EscrowController],
      providers: [
        { provide: EscrowService, useValue: mockEscrowService },
      ],
    }).compile();

    controller = module.get(EscrowController);
    escrowService = module.get(EscrowService) as jest.Mocked<EscrowService>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await module.close();
  });

  describe('deposit', () => {
    it('calls escrowService.depositForUser with userId and body', async () => {
      escrowService.depositForUser.mockResolvedValue(ESCROW);

      const result = await controller.deposit('user-1', {
        payeePublicKey: 'GPAYEE',
        tokenContractId: 'CTOKEN',
        amount: '5000000',
        timeoutLedgers: 100,
      });

      expect(result).toEqual({ escrow: ESCROW });
      expect(escrowService.depositForUser).toHaveBeenCalledWith('user-1', {
        payeePublicKey: 'GPAYEE',
        tokenContractId: 'CTOKEN',
        amount: '5000000',
        timeoutLedgers: 100,
      });
    });

    it('propagates EscrowFailedError when Soroban deposit fails', async () => {
      escrowService.depositForUser.mockRejectedValue(
        new EscrowFailedError('Soroban invocation failed'),
      );

      await expect(
        controller.deposit('user-1', {
          payeePublicKey: 'GPAYEE',
          tokenContractId: 'CTOKEN',
          amount: '5000000',
          timeoutLedgers: 100,
        }),
      ).rejects.toBeInstanceOf(EscrowFailedError);
    });

    it('returns existing escrow on duplicate idempotency key', async () => {
      const existing = { ...ESCROW, status: 'LOCKED' as const };
      escrowService.depositForUser.mockResolvedValue(existing);

      const result = await controller.deposit('user-1', {
        payeePublicKey: 'GPAYEE',
        tokenContractId: 'CTOKEN',
        amount: '5000000',
        timeoutLedgers: 100,
        idempotencyKey: 'key-1',
      });

      expect(result).toEqual({ escrow: existing });
    });
  });

  describe('get', () => {
    it('returns the escrow when owned by the caller', async () => {
      escrowService.getEscrowForUser.mockResolvedValue(ESCROW);

      const result = await controller.get('user-1', 'escrow-1');

      expect(result).toEqual({ escrow: ESCROW });
      expect(escrowService.getEscrowForUser).toHaveBeenCalledWith(
        'user-1',
        'escrow-1',
      );
    });

    it('throws ForbiddenException when escrow belongs to another user', async () => {
      escrowService.getEscrowForUser.mockRejectedValue(
        new ForbiddenException('You do not have access to this escrow'),
      );

      await expect(controller.get('user-1', 'escrow-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException for a non-existent escrow', async () => {
      escrowService.getEscrowForUser.mockRejectedValue(
        new NotFoundException('Escrow not found'),
      );

      await expect(controller.get('user-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('release', () => {
    it('releases a locked escrow and marks it RELEASED', async () => {
      const released = { ...ESCROW, status: 'RELEASED' as const, finalizeTxHash: 'release-hash' };
      escrowService.releaseForUser.mockResolvedValue(released);

      const result = await controller.release('user-1', 'escrow-1');

      expect(result).toEqual({ escrow: released });
      expect(escrowService.releaseForUser).toHaveBeenCalledWith(
        'user-1',
        'escrow-1',
      );
    });

    it('throws ForbiddenException when escrow belongs to another user', async () => {
      escrowService.releaseForUser.mockRejectedValue(
        new ForbiddenException('You do not have access to this escrow'),
      );

      await expect(controller.release('user-1', 'escrow-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException for a non-existent escrow', async () => {
      escrowService.releaseForUser.mockRejectedValue(
        new NotFoundException('Escrow not found'),
      );

      await expect(controller.release('user-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws EscrowFailedError when escrow is not LOCKED', async () => {
      escrowService.releaseForUser.mockRejectedValue(
        new EscrowFailedError('Escrow is not in a releasable state'),
      );

      await expect(controller.release('user-1', 'escrow-1')).rejects.toThrow(
        EscrowFailedError,
      );
    });
  });

  describe('refund', () => {
    it('refunds a locked escrow and marks it REFUNDED', async () => {
      const refunded = { ...ESCROW, status: 'REFUNDED' as const, finalizeTxHash: 'refund-hash' };
      escrowService.refundForUser.mockResolvedValue(refunded);

      const result = await controller.refund('user-1', 'escrow-1');

      expect(result).toEqual({ escrow: refunded });
      expect(escrowService.refundForUser).toHaveBeenCalledWith(
        'user-1',
        'escrow-1',
      );
    });

    it('throws ForbiddenException when escrow belongs to another user', async () => {
      escrowService.refundForUser.mockRejectedValue(
        new ForbiddenException('You do not have access to this escrow'),
      );

      await expect(controller.refund('user-1', 'escrow-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException for a non-existent escrow', async () => {
      escrowService.refundForUser.mockRejectedValue(
        new NotFoundException('Escrow not found'),
      );

      await expect(controller.refund('user-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws EscrowFailedError when escrow is not LOCKED', async () => {
      escrowService.refundForUser.mockRejectedValue(
        new EscrowFailedError('Escrow is not in a refundable state'),
      );

      await expect(controller.refund('user-1', 'escrow-1')).rejects.toThrow(
        EscrowFailedError,
      );
    });
  });
});
