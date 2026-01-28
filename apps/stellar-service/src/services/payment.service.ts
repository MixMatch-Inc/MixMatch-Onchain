import { Operation } from '@stellar/stellar-sdk';
import { buildAndSubmitTx } from './transaction.service';
import { checkAccount } from './account.service';
import { PLATFORM_FEE, TREASURY_KEY } from '../config/stellar';

export const sendPayment = async (
  destination: string,
  amountStr: string,
  memo?: string,
) => {
  console.log(`💸 Processing Payment: ${amountStr} XLM -> ${destination}`);

  const recipient = await checkAccount(destination);
  if (!recipient.exists) {
    throw new Error('❌ Recipient account does not exist.');
  }

  const totalAmount = Number(amountStr);
  const feeAmount = totalAmount * PLATFORM_FEE;
  const payoutAmount = totalAmount - feeAmount;

  const feeString = feeAmount.toFixed(7);
  const payoutString = payoutAmount.toFixed(7);

  console.log(
    `   🧾 Split: DJ gets ${payoutString} | Platform gets ${feeString}`,
  );

  const operations = [];

  operations.push(
    Operation.payment({
      destination: destination,
      asset: undefined as any,
      amount: payoutString,
    }),
  );

  if (feeAmount > 0) {
    operations.push(
      Operation.payment({
        destination: TREASURY_KEY,
        asset: undefined as any,
        amount: feeString,
      }),
    );
  }

  return await buildAndSubmitTx(operations, memo);
};
