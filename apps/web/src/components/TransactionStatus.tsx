import type { TransactionRecord } from '@mixmatch/shared';

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
    <dl aria-label="Transaction status">
      <dt>Status</dt>
      <dd data-status={transaction.status}>{STATUS_LABEL[transaction.status]}</dd>

      <dt>Recipient</dt>
      <dd>{transaction.destinationPublicKey}</dd>

      <dt>Amount</dt>
      <dd>{transaction.amount} XLM</dd>

      {transaction.memo && (
        <>
          <dt>Memo</dt>
          <dd>{transaction.memo}</dd>
        </>
      )}

      {transaction.stellarTxHash && (
        <>
          <dt>Transaction hash</dt>
          <dd>{transaction.stellarTxHash}</dd>
        </>
      )}

      {transaction.status === 'FAILED' && transaction.failureReason && (
        <>
          <dt>Failure reason</dt>
          <dd role="alert">{transaction.failureReason}</dd>
        </>
      )}
    </dl>
  );
}
