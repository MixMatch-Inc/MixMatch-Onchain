import { sendPaymentSchema, type SendPaymentInput, type TransactionRecord } from '@mixmatch/shared';
import { useState } from 'react';
import { ActivityIndicator, Button, Text, TextInput, View } from 'react-native';

type PaymentField = 'destinationPublicKey' | 'amount' | 'memo';

export interface PaymentFormProps {
  onSubmit: (values: SendPaymentInput) => Promise<TransactionRecord>;
  onSuccess?: (transaction: TransactionRecord) => void;
  initialDestinationPublicKey?: string;
}

export function PaymentForm({ onSubmit, onSuccess, initialDestinationPublicKey }: PaymentFormProps) {
  const [destinationPublicKey, setDestinationPublicKey] = useState(initialDestinationPublicKey ?? '');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<PaymentField, string>>>({});

  const handleSubmit = async () => {
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
    <View accessibilityLabel="Send payment">
      <View>
        <Text>Recipient address</Text>
        <TextInput
          testID="destinationPublicKey"
          value={destinationPublicKey}
          onChangeText={setDestinationPublicKey}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {fieldErrors.destinationPublicKey && <Text accessibilityRole="alert">{fieldErrors.destinationPublicKey}</Text>}
      </View>

      <View>
        <Text>Amount (XLM)</Text>
        <TextInput testID="amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        {fieldErrors.amount && <Text accessibilityRole="alert">{fieldErrors.amount}</Text>}
      </View>

      <View>
        <Text>Memo (optional)</Text>
        <TextInput testID="memo" value={memo} onChangeText={setMemo} />
        {fieldErrors.memo && <Text accessibilityRole="alert">{fieldErrors.memo}</Text>}
      </View>

      {error && <Text accessibilityRole="alert">{error}</Text>}

      {isSubmitting ? (
        <ActivityIndicator testID="payment-form-loading" />
      ) : (
        <Button title="Send payment" onPress={handleSubmit} disabled={isSubmitting} />
      )}
    </View>
  );
}
