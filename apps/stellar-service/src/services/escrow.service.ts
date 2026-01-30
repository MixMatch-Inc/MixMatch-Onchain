import { Operation, Claimant, Asset } from '@stellar/stellar-sdk';
import { buildAndSubmitTx } from './transaction.service';
import { checkAccount } from './account.service';
import { TREASURY_KEY } from '../config/stellar';

export const createEscrow = async (
  destination: string,
  amount: string,
  unlockDate: string
) => {
  console.log(`🔒 Creating Escrow: ${amount} XLM for ${destination}`);
  console.log(`   Unlock Date: ${unlockDate}`);

  const recipient = await checkAccount(destination);
  if (!recipient.exists) {
    throw new Error('❌ DJ account does not exist. Cannot create escrow.');
  }

  const unlockTimestamp = Math.floor(new Date(unlockDate).getTime() / 1000);
  const now = Math.floor(Date.now() / 1000);

  if (unlockTimestamp <= now) {
    throw new Error('❌ Unlock date must be in the future.');
  }

  const claimants = [
    new Claimant(
      destination,
      Claimant.predicateNot(
        Claimant.predicateBeforeAbsoluteTime(unlockTimestamp.toString())
      )
    ),
    new Claimant(
      TREASURY_KEY,
      Claimant.predicateUnconditional()
    ),
  ];

  const escrowOp = Operation.createClaimableBalance({
    claimants: claimants,
    asset: Asset.native(),
    amount: amount,
  });

  return await buildAndSubmitTx([escrowOp], 'MixMatch Escrow');
};