import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentService } from '../payment.service.js';
import { ValidationError } from '../../../shared/errors/AppError.js';

vi.mock('@mixmatch/stellar', () => {
  const mockSendPayment = vi.fn();
  const mockGetPaymentHistory = vi.fn();
  const mockGetPaymentStatus = vi.fn();
  const mockGetNetwork = vi.fn().mockReturnValue('testnet');

  return {
    createStellarClient: vi.fn().mockReturnValue({
      getNetwork: mockGetNetwork,
      horizon: {},
      soroban: {},
    }),
    StellarPaymentService: vi.fn().mockImplementation(() => ({
      sendPayment: mockSendPayment,
      getPaymentHistory: mockGetPaymentHistory,
      getPaymentStatus: mockGetPaymentStatus,
    })),
  };
});

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PaymentService();
  });

  describe('sendPayment', () => {
    it('sends a payment with valid params', async () => {
      const { StellarPaymentService } = await import('@mixmatch/stellar');
      const mockInstance = vi.mocked(StellarPaymentService).mock.results[0]?.value;
      if (mockInstance) {
        vi.mocked(mockInstance.sendPayment).mockResolvedValue({
          success: true,
          transactionHash: 'abc123',
        });
      }

      const result = await service.sendPayment('SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', {
        toAddress: 'G' + 'A'.repeat(55),
        amount: '10.0',
      });

      expect(result.success).toBe(true);
      expect(result.transactionHash).toBe('abc123');
    });

    it('rejects invalid address', async () => {
      await expect(
        service.sendPayment('SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', {
          toAddress: 'invalid',
          amount: '10.0',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('rejects zero amount', async () => {
      await expect(
        service.sendPayment('SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', {
          toAddress: 'G' + 'A'.repeat(55),
          amount: '0',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('rejects negative amount', async () => {
      await expect(
        service.sendPayment('SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', {
          toAddress: 'G' + 'A'.repeat(55),
          amount: '-5',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('rejects empty amount', async () => {
      await expect(
        service.sendPayment('SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', {
          toAddress: 'G' + 'A'.repeat(55),
          amount: '',
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getPaymentHistory', () => {
    it('payment history returns array', async () => {
      const { StellarPaymentService } = await import('@mixmatch/stellar');
      const mockInstance = vi.mocked(StellarPaymentService).mock.results[0]?.value;
      const mockHistory = [
        {
          hash: 'tx1',
          amount: '10',
          asset: 'XLM',
          from: 'G' + 'A'.repeat(55),
          to: 'G' + 'B'.repeat(55),
          timestamp: new Date(),
        },
      ];
      if (mockInstance) {
        vi.mocked(mockInstance.getPaymentHistory).mockResolvedValue(mockHistory);
      }

      const result = await service.getPaymentHistory('G' + 'A'.repeat(55));

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });

    it('rejects invalid address', async () => {
      await expect(service.getPaymentHistory('invalid')).rejects.toThrow(ValidationError);
    });

    it('rejects limit out of range', async () => {
      await expect(service.getPaymentHistory('G' + 'A'.repeat(55), 0)).rejects.toThrow(ValidationError);
      await expect(service.getPaymentHistory('G' + 'A'.repeat(55), 101)).rejects.toThrow(ValidationError);
    });
  });

  describe('getPaymentStatus', () => {
    it('returns status for valid hash', async () => {
      const { StellarPaymentService } = await import('@mixmatch/stellar');
      const mockInstance = vi.mocked(StellarPaymentService).mock.results[0]?.value;
      if (mockInstance) {
        vi.mocked(mockInstance.getPaymentStatus).mockResolvedValue('success');
      }

      const status = await service.getPaymentStatus('abc123');
      expect(status).toBe('success');
    });

    it('rejects empty hash', async () => {
      await expect(service.getPaymentStatus('')).rejects.toThrow(ValidationError);
    });
  });
});
