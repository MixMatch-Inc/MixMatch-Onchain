import { IsNotEmpty, IsString, Matches, Length } from 'class-validator';

/**
 * Contract defining input/output specifications for verifying wallet signatures.
 */
export class VerifySignatureDto {
  @IsNotEmpty({ message: 'Stellar address is required' })
  @IsString()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Address must be a valid Stellar public key',
  })
  address!: string;

  @IsNotEmpty({ message: 'Challenge nonce is required' })
  @IsString()
  @Length(32, 128, { message: 'Challenge nonce must be between 32 and 128 characters' })
  nonce!: string;

  @IsNotEmpty({ message: 'Signature string is required' })
  @IsString()
  signature!: string;
}