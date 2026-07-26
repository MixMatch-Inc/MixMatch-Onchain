import { validate } from 'class-validator';
import { ChallengeRequestDto } from './challenge-request.dto';
import { VerifySignatureDto } from './verify-signature.dto';

describe('Validation Contracts — Input & Boundary Constraints', () => {
  describe('ChallengeRequestDto', () => {
    it('should pass validation with a valid Stellar address', async () => {
      const dto = new ChallengeRequestDto();
      dto.address = 'GABC1234567890123456789012345678901234567890123456789012';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation on invalid Stellar address format', async () => {
      const dto = new ChallengeRequestDto();
      dto.address = 'invalid-address-format';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('matches');
    });
  });

  describe('VerifySignatureDto', () => {
    it('should fail when nonce length is outside expected contract boundaries', async () => {
      const dto = new VerifySignatureDto();
      dto.address = 'GABC1234567890123456789012345678901234567890123456789012';
      dto.nonce = 'short';
      dto.signature = 'valid-sig';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('nonce');
    });
  });
});