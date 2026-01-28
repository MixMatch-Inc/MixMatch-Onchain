import { Operation } from '@stellar/stellar-sdk';
import { buildAndSubmitTx } from './transaction.service';
import { checkAccount } from './account.service';

export const sendPayment = async (
  destination: string,
  amount: string,
  memo?: string,
) => {
  console.log(`💸 Initiating Payment: ${amount} XLM -> ${destination}`);

  const recipient = await checkAccount(destination);

  if (!recipient.exists) {
    throw new Error(
      '❌ Recipient account does not exist. (For MVP, we require active accounts)',
    );
  }

  const paymentOp = Operation.payment({
    destination: destination,
    asset: undefined as any,
    amount: amount,
  });

  return await buildAndSubmitTx([paymentOp], memo);
};
