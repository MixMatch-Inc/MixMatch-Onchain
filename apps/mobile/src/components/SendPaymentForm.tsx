import { sendPaymentSchema, type SendPaymentInput, type TransactionRecord } from '@mixmatch/shared';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type PaymentField = 'destinationPublicKey' | 'amount' | 'memo' | 'assetCode' | 'assetIssuer';

export interface SendPaymentFormProps {
  onSubmit: (values: SendPaymentInput) => Promise<TransactionRecord>;
  onSuccess?: (transaction: TransactionRecord) => void;
  initialDestination?: string;
}

export default function SendPaymentForm({ onSubmit, onSuccess, initialDestination }: SendPaymentFormProps) {
  const [destinationPublicKey, setDestinationPublicKey] = useState(initialDestination ?? '');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [showAssetFields, setShowAssetFields] = useState(false);
  const [assetCode, setAssetCode] = useState('');
  const [assetIssuer, setAssetIssuer] = useState('');
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
      assetCode: showAssetFields && assetCode ? assetCode : undefined,
      assetIssuer: showAssetFields && assetIssuer ? assetIssuer : undefined,
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
      setAssetCode('');
      setAssetIssuer('');
      onSuccess?.(transaction);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Recipient address</Text>
      <TextInput
        style={styles.input}
        value={destinationPublicKey}
        onChangeText={setDestinationPublicKey}
        autoCapitalize="characters"
        testID="destination-input"
      />
      {fieldErrors.destinationPublicKey && <Text style={styles.fieldError}>{fieldErrors.destinationPublicKey}</Text>}

      <Text style={styles.label}>Amount (XLM)</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        testID="amount-input"
      />
      {fieldErrors.amount && <Text style={styles.fieldError}>{fieldErrors.amount}</Text>}

      <Text style={styles.label}>Memo (optional)</Text>
      <TextInput style={styles.input} value={memo} onChangeText={setMemo} testID="memo-input" />
      {fieldErrors.memo && <Text style={styles.fieldError}>{fieldErrors.memo}</Text>}

      <TouchableOpacity
        onPress={() => setShowAssetFields((prev) => !prev)}
        testID="toggle-asset-fields"
      >
        <Text style={styles.link}>{showAssetFields ? 'Send XLM instead' : 'Send a different asset'}</Text>
      </TouchableOpacity>

      {showAssetFields && (
        <>
          <Text style={styles.label}>Asset code</Text>
          <TextInput
            style={styles.input}
            value={assetCode}
            onChangeText={setAssetCode}
            autoCapitalize="characters"
            testID="asset-code-input"
          />
          {fieldErrors.assetCode && <Text style={styles.fieldError}>{fieldErrors.assetCode}</Text>}

          <Text style={styles.label}>Asset issuer</Text>
          <TextInput
            style={styles.input}
            value={assetIssuer}
            onChangeText={setAssetIssuer}
            autoCapitalize="characters"
            testID="asset-issuer-input"
          />
          {fieldErrors.assetIssuer && <Text style={styles.fieldError}>{fieldErrors.assetIssuer}</Text>}
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.button} onPress={() => void handleSubmit()} disabled={isSubmitting} testID="send-button">
        {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send payment</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  label: { fontSize: 14, color: '#666', marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  fieldError: { color: '#e00', fontSize: 12, marginTop: 4 },
  link: { color: '#0066cc', fontSize: 14, marginTop: 16 },
  error: { color: '#e00', textAlign: 'center', marginTop: 12 },
  button: {
    backgroundColor: '#000',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
