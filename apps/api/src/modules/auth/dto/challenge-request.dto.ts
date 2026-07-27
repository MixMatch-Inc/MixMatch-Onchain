import { IsNotEmpty, IsString, Matches } from 'class-validator';

/**
 * Contract defining input requirements for requesting an auth challenge nonces/messages.
 */
export class ChallengeRequestDto {
  @IsNotEmpty({ message: 'Stellar address is required' })
  @IsString({ message: 'Address must be a valid string' })
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Address must be a valid Stellar public key (G...)',
  })
  address!: string;
}