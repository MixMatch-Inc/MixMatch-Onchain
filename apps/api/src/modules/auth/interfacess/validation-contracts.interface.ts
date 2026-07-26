/**
 * Output boundaries for authorization contract execution.
 */
export interface ChallengeResponseContract {
  nonce: string;
  message: string;
  expiresAt: string;
}

export interface AuthTokenResponseContract {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: {
    address: string;
  };
}