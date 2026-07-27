'use client';

import { sendPaymentSchema, type SendPaymentInput, type TransactionRecord } from '@mixmatch/shared';
import { type FormEvent, useState } from 'react';

type PaymentField = 'destinationPublicKey' | 'amount' | 'memo';

export interface PaymentFormProps {
  onSubmit: (values: SendPaymentInput) => Promise<TransactionRecord>;
  onSuccess?: (transaction: TransactionRecord) => void;
}

export function PaymentForm({ onSubmit, onSuccess }: PaymentFormProps) {
  const [destinationPublicKey, setDestinationPublicKey] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<PaymentField, string>>>({});

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const result = sendPaymentSchema.safeParse({
      destinationPublicKey,
      amount,
      memo: memo || undefined,
    });

    if (!result.success) {
      const errors: Partial<Record<PaymentField, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as PaymentField;
        if (key && !errors[key]) {
          errors[key] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const transaction = await onSubmit(result.data);
      setDestinationPublicKey('');
      setAmount('');
      setMemo('');
      onSuccess?.(transaction);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Send payment" noValidate>
      <div>
        <label htmlFor="destinationPublicKey">Recipient address</label>
        <input
          id="destinationPublicKey"
          name="destinationPublicKey"
          value={destinationPublicKey}
          onChange={(event) => setDestinationPublicKey(event.target.value)}
          required
        />
        {fieldErrors.destinationPublicKey && <p role="alert">{fieldErrors.destinationPublicKey}</p>}
      </div>

      <div>
        <label htmlFor="amount">Amount (XLM)</label>
        <input
          id="amount"
          name="amount"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="decimal"
          required
        />
        {fieldErrors.amount && <p role="alert">{fieldErrors.amount}</p>}
      </div>

      <div>
        <label htmlFor="memo">Memo (optional)</label>
        <input id="memo" name="memo" value={memo} onChange={(event) => setMemo(event.target.value)} />
        {fieldErrors.memo && <p role="alert">{fieldErrors.memo}</p>}
      </div>

      {error && <p role="alert">{error}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Sending…' : 'Send payment'}
      </button>
    </form>
  );
}
