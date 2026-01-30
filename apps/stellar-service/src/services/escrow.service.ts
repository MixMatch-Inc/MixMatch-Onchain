import { Operation, Claimant, Asset } from '@stellar/stellar-sdk';
import { buildAndSubmitTx } from './transaction.service';
import { checkAccount } from './account.service';
import { TREASURY_KEY } from '../config/stellar';

/**
 * Creates an on-chain Escrow (Claimable Balance).
 * @param destination - The DJ's Public Key
 * @param amount - Amount of XLM to lock
 * @param unlockDate - ISO Date string (e.g., "2024-12-25T20:00:00Z") when funds unlock
 */
export const createEscrow = async (
  destination: string,
  amount: string,
  unlockDate: string
) => {
  console.log(`🔒 Creating Escrow: ${amount} XLM for ${destination}`);
  console.log(`   Unlock Date: ${unlockDate}`);

  // 1. Validate Destination
  const recipient = await checkAccount(destination);
  if (!recipient.exists) {
    throw new Error('❌ DJ account does not exist. Cannot create escrow.');
  }

  // 2. Calculate Timestamps
  // Stellar requires "Seconds since Epoch" (Unix Timestamp)
  const unlockTimestamp = Math.floor(new Date(unlockDate).getTime() / 1000);
  const now = Math.floor(Date.now() / 1000);

  if (unlockTimestamp <= now) {
    throw new Error('❌ Unlock date must be in the future.');
  }

  // 3. Define Claimants (Who can take the money?)
  const claimants = [
    // A: The DJ (Can claim ONLY AFTER the unlock date)
    new Claimant(
      destination,
      Claimant.predicateNot(
        Claimant.predicateBeforeAbsoluteTime(unlockTimestamp.toString())
      )
    ),
    // B: The Platform/Admin (Can claim ANYTIME - for disputes/refunds)
    new Claimant(
      TREASURY_KEY, // We use the Treasury key as the "Mediator"
      Claimant.predicateUnconditional()
    ),
  ];

  // 4. Create the Operation
  const escrowOp = Operation.createClaimableBalance({
    claimants: claimants,
    asset: Asset.native(),
    amount: amount,
  });

  // 5. Submit Transaction
  return await buildAndSubmitTx([escrowOp], 'MixMatch Escrow');
};