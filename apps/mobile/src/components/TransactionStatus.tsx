import type { TransactionRecord } from '@mixmatch/shared';
import { Text, View } from 'react-native';

const STATUS_LABEL: Record<TransactionRecord['status'], string> = {
  PENDING: 'Pending',
  SUCCESS: 'Success',
  FAILED: 'Failed',
};

export interface TransactionStatusProps {
  transaction: TransactionRecord;
}

export function TransactionStatus({ transaction }: TransactionStatusProps) {
  return (
    <View accessibilityLabel="Transaction status">
      <Text>Status</Text>
      <Text testID="transaction-status">{STATUS_LABEL[transaction.status]}</Text>

      <Text>Recipient</Text>
      <Text>{transaction.destinationPublicKey}</Text>

      <Text>Amount</Text>
      <Text>{transaction.amount} XLM</Text>

      {transaction.memo && (
        <>
          <Text>Memo</Text>
          <Text>{transaction.memo}</Text>
        </>
      )}

      {transaction.stellarTxHash && (
        <>
          <Text>Transaction hash</Text>
          <Text>{transaction.stellarTxHash}</Text>
        </>
      )}

      {transaction.status === 'FAILED' && transaction.failureReason && (
        <>
          <Text>Failure reason</Text>
          <Text accessibilityRole="alert">{transaction.failureReason}</Text>
        </>
      )}
    </View>
  );
}
