import { sendPaymentSchema, type PathQuoteResponse, type SendPaymentInput, type TransactionRecord } from '@mixmatch/shared';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type PaymentField =
  | 'destinationPublicKey'
  | 'amount'
  | 'memo'
  | 'assetCode'
  | 'assetIssuer'
  | 'receiveAssetCode'
  | 'receiveAssetIssuer';

export interface SendPaymentFormProps {
  onSubmit: (values: SendPaymentInput) => Promise<TransactionRecord>;
  onSuccess?: (transaction: TransactionRecord) => void;
  /** Fetches a path-payment quote for a "send asset A, recipient gets asset B" preview. Required for the receive-asset flow to show a preview before submitting. */
  onQuote?: (params: {
    sourceAssetCode?: string;
    sourceAssetIssuer?: string;
    destAssetCode: string;
    destAssetIssuer: string;
    amount: string;
  }) => Promise<PathQuoteResponse>;
  initialDestination?: string;
}

export default function SendPaymentForm({ onSubmit, onSuccess, onQuote, initialDestination }: SendPaymentFormProps) {
  const [destinationPublicKey, setDestinationPublicKey] = useState(initialDestination ?? '');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [showAssetFields, setShowAssetFields] = useState(false);
  const [assetCode, setAssetCode] = useState('');
  const [assetIssuer, setAssetIssuer] = useState('');
  const [showReceiveAssetFields, setShowReceiveAssetFields] = useState(false);
  const [receiveAssetCode, setReceiveAssetCode] = useState('');
  const [receiveAssetIssuer, setReceiveAssetIssuer] = useState('');
  const [quote, setQuote] = useState<PathQuoteResponse | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
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
      receiveAssetCode: showReceiveAssetFields && receiveAssetCode ? receiveAssetCode : undefined,
      receiveAssetIssuer: showReceiveAssetFields && receiveAssetIssuer ? receiveAssetIssuer : undefined,
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
      setReceiveAssetCode('');
      setReceiveAssetIssuer('');
      setQuote(null);
      onSuccess?.(transaction);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGetQuote = async () => {
    setQuoteError(null);
    setQuote(null);
    if (!onQuote || !receiveAssetCode || !receiveAssetIssuer || !amount) {
      return;
    }
    setIsQuoting(true);
    try {
      const result = await onQuote({
        sourceAssetCode: assetCode || undefined,
        sourceAssetIssuer: assetIssuer || undefined,
        destAssetCode: receiveAssetCode,
        destAssetIssuer: receiveAssetIssuer,
        amount,
      });
      setQuote(result);
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : 'Could not find a payment path');
    } finally {
      setIsQuoting(false);
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
        accessibilityLabel="Recipient address"
        accessibilityHint="Enter the Stellar public key that should receive the payment"
        testID="destination-input"
      />
      {fieldErrors.destinationPublicKey && <Text style={styles.fieldError}>{fieldErrors.destinationPublicKey}</Text>}

      <Text style={styles.label}>Amount (XLM)</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        accessibilityLabel="Amount in XLM"
        accessibilityHint="Enter how much Stellar Lumens to send"
        testID="amount-input"
      />
      {fieldErrors.amount && <Text style={styles.fieldError}>{fieldErrors.amount}</Text>}

      <Text style={styles.label}>Memo (optional)</Text>
      <TextInput
        style={styles.input}
        value={memo}
        onChangeText={setMemo}
        accessibilityLabel="Memo"
        accessibilityHint="Optional note that will be attached to the payment"
        testID="memo-input"
      />
      {fieldErrors.memo && <Text style={styles.fieldError}>{fieldErrors.memo}</Text>}

      <TouchableOpacity
        onPress={() => setShowAssetFields((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel={showAssetFields ? 'Hide asset fields' : 'Show asset fields'}
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
            accessibilityLabel="Asset code"
            testID="asset-code-input"
          />
          {fieldErrors.assetCode && <Text style={styles.fieldError}>{fieldErrors.assetCode}</Text>}

          <Text style={styles.label}>Asset issuer</Text>
          <TextInput
            style={styles.input}
            value={assetIssuer}
            onChangeText={setAssetIssuer}
            autoCapitalize="characters"
            accessibilityLabel="Asset issuer"
            testID="asset-issuer-input"
          />
          {fieldErrors.assetIssuer && <Text style={styles.fieldError}>{fieldErrors.assetIssuer}</Text>}
        </>
      )}

      {onQuote && (
        <TouchableOpacity
          onPress={() => setShowReceiveAssetFields((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel={showReceiveAssetFields ? 'Hide receive asset fields' : 'Show receive asset fields'}
          testID="toggle-receive-asset-fields"
        >
          <Text style={styles.link}>
            {showReceiveAssetFields ? "Recipient gets the same asset I send" : "Recipient should get a different asset"}
          </Text>
        </TouchableOpacity>
      )}

      {showReceiveAssetFields && (
        <>
          <Text style={styles.label}>Recipient receives (asset code)</Text>
          <TextInput
            style={styles.input}
            value={receiveAssetCode}
            onChangeText={(value) => {
              setReceiveAssetCode(value);
              setQuote(null);
            }}
            autoCapitalize="characters"
            accessibilityLabel="Recipient receives asset code"
            testID="receive-asset-code-input"
          />
          {fieldErrors.receiveAssetCode && <Text style={styles.fieldError}>{fieldErrors.receiveAssetCode}</Text>}

          <Text style={styles.label}>Recipient receives (asset issuer)</Text>
          <TextInput
            style={styles.input}
            value={receiveAssetIssuer}
            onChangeText={(value) => {
              setReceiveAssetIssuer(value);
              setQuote(null);
            }}
            autoCapitalize="characters"
            accessibilityLabel="Recipient receives asset issuer"
            testID="receive-asset-issuer-input"
          />
          {fieldErrors.receiveAssetIssuer && <Text style={styles.fieldError}>{fieldErrors.receiveAssetIssuer}</Text>}

          <TouchableOpacity
            style={styles.quoteButton}
            onPress={() => void handleGetQuote()}
            disabled={isQuoting}
            accessibilityRole="button"
            accessibilityLabel="Preview payment conversion"
            testID="get-quote-button"
          >
            {isQuoting ? <ActivityIndicator /> : <Text style={styles.quoteButtonText}>Preview conversion</Text>}
          </TouchableOpacity>

          {quoteError && <Text style={styles.error}>{quoteError}</Text>}

          {quote && (
            <Text style={styles.quotePreview} testID="quote-preview">
              You send {quote.sourceAmount}, recipient gets approximately {quote.destAmount}
            </Text>
          )}
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={styles.button}
        onPress={() => void handleSubmit()}
        disabled={isSubmitting}
        accessibilityRole="button"
        accessibilityLabel="Send payment"
        testID="send-button"
      >
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
  quoteButton: {
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  quoteButtonText: { color: '#000', fontSize: 14, fontWeight: '600' },
  quotePreview: { fontSize: 14, color: '#333', marginTop: 8, textAlign: 'center' },
  button: {
    backgroundColor: '#000',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
