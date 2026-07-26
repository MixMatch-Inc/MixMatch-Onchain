'use client';

import { type FormEvent, useState } from 'react';

export interface PaymentFormValues {
  toAddress: string;
  amount: string;
  memo?: string;
}

export interface PaymentFormProps {
  onSubmit: (values: PaymentFormValues) => Promise<void>;
}

export function PaymentForm({ onSubmit }: PaymentFormProps) {
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      await onSubmit({ toAddress, amount, memo: memo || undefined });
      setSuccess(true);
      setToAddress('');
      setAmount('');
      setMemo('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Send Payment" noValidate>
      <h2>Send Payment</h2>

      <div>
        <label htmlFor="toAddress">Recipient Address</label>
        <input
          id="toAddress"
          name="toAddress"
          type="text"
          value={toAddress}
          onChange={(event) => setToAddress(event.target.value)}
          placeholder="G..."
          required
        />
      </div>

      <div>
        <label htmlFor="amount">Amount (XLM)</label>
        <input
          id="amount"
          name="amount"
          type="text"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0.0000000"
          required
        />
      </div>

      <div>
        <label htmlFor="memo">Memo (optional)</label>
        <input
          id="memo"
          name="memo"
          type="text"
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
          placeholder="Optional memo"
        />
      </div>

      {error && <p role="alert">{error}</p>}
      {success && <p role="status">Payment sent successfully!</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Sending...' : 'Send Payment'}
      </button>
    </form>
  );
}
