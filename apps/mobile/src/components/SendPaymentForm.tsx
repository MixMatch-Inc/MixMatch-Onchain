import { sendPaymentSchema, type PathQuoteResponse, type SendPaymentInput, type TransactionRecord } from '@mixmatch/shared';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useT } from '../i18n-context';
import type { Palette } from '../palette';
import { useTheme } from '../theme-context';

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
  /** Prefill from a payment link or QR (#1405). */
  initialAmount?: string;
  initialMemo?: string;
}

export default function SendPaymentForm({
  onSubmit,
  onSuccess,
  onQuote,
  initialDestination,
  initialAmount,
  initialMemo,
}: SendPaymentFormProps) {
  const { t } = useT();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [destinationPublicKey, setDestinationPublicKey] = useState(initialDestination ?? '');
  const [amount, setAmount] = useState(initialAmount ?? '');
  const [memo, setMemo] = useState(initialMemo ?? '');
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
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
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
      <Text style={styles.label}>{t('payments.recipient')}</Text>
      <TextInput
        style={styles.input}
        value={destinationPublicKey}
        onChangeText={setDestinationPublicKey}
        autoCapitalize="characters"
        testID="destination-input"
      />
      {fieldErrors.destinationPublicKey && <Text style={styles.fieldError}>{fieldErrors.destinationPublicKey}</Text>}

      <Text style={styles.label}>{t('payments.amountXlm')}</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        testID="amount-input"
      />
      {fieldErrors.amount && <Text style={styles.fieldError}>{fieldErrors.amount}</Text>}

      <Text style={styles.label}>{t('payments.memoOptional')}</Text>
      <TextInput style={styles.input} value={memo} onChangeText={setMemo} testID="memo-input" />
      {fieldErrors.memo && <Text style={styles.fieldError}>{fieldErrors.memo}</Text>}

      <TouchableOpacity
        onPress={() => setShowAssetFields((prev) => !prev)}
        testID="toggle-asset-fields"
      >
        <Text style={styles.link}>{showAssetFields ? t('payments.sendXlm') : t('payments.sendDifferentAsset')}</Text>
      </TouchableOpacity>

      {showAssetFields && (
        <>
          <Text style={styles.label}>{t('payments.assetCode')}</Text>
          <TextInput
            style={styles.input}
            value={assetCode}
            onChangeText={setAssetCode}
            autoCapitalize="characters"
            testID="asset-code-input"
          />
          {fieldErrors.assetCode && <Text style={styles.fieldError}>{fieldErrors.assetCode}</Text>}

          <Text style={styles.label}>{t('payments.assetIssuer')}</Text>
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

      {onQuote && (
        <TouchableOpacity
          onPress={() => setShowReceiveAssetFields((prev) => !prev)}
          testID="toggle-receive-asset-fields"
        >
          <Text style={styles.link}>
            {showReceiveAssetFields ? t('payments.recipientSameAsset') : t('payments.recipientDifferentAsset')}
          </Text>
        </TouchableOpacity>
      )}

      {showReceiveAssetFields && (
        <>
          <Text style={styles.label}>{t('payments.receiveAssetCode')}</Text>
          <TextInput
            style={styles.input}
            value={receiveAssetCode}
            onChangeText={(value) => {
              setReceiveAssetCode(value);
              setQuote(null);
            }}
            autoCapitalize="characters"
            testID="receive-asset-code-input"
          />
          {fieldErrors.receiveAssetCode && <Text style={styles.fieldError}>{fieldErrors.receiveAssetCode}</Text>}

          <Text style={styles.label}>{t('payments.receiveAssetIssuer')}</Text>
          <TextInput
            style={styles.input}
            value={receiveAssetIssuer}
            onChangeText={(value) => {
              setReceiveAssetIssuer(value);
              setQuote(null);
            }}
            autoCapitalize="characters"
            testID="receive-asset-issuer-input"
          />
          {fieldErrors.receiveAssetIssuer && <Text style={styles.fieldError}>{fieldErrors.receiveAssetIssuer}</Text>}

          <TouchableOpacity
            style={styles.quoteButton}
            onPress={() => void handleGetQuote()}
            disabled={isQuoting}
            testID="get-quote-button"
          >
            {isQuoting ? <ActivityIndicator /> : <Text style={styles.quoteButtonText}>{t('payments.previewConversion')}</Text>}
          </TouchableOpacity>

          {quoteError && <Text style={styles.error}>{quoteError}</Text>}

          {quote && (
            <Text style={styles.quotePreview} testID="quote-preview">
              {t('payments.quotePreview', { source: quote.sourceAmount, dest: quote.destAmount })}
            </Text>
          )}
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.button} onPress={() => void handleSubmit()} disabled={isSubmitting} testID="send-button">
        {isSubmitting ? <ActivityIndicator color={colors.primaryText} /> : <Text style={styles.buttonText}>{t('payments.sendPayment')}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { padding: 16 },
    label: { fontSize: 14, color: c.textMuted, marginTop: 12, marginBottom: 4 },
    input: { borderWidth: 1, borderColor: c.border, borderRadius: 8, padding: 12, fontSize: 16, color: c.text },
    fieldError: { color: c.error, fontSize: 12, marginTop: 4 },
    link: { color: c.link, fontSize: 14, marginTop: 16 },
    error: { color: c.error, textAlign: 'center', marginTop: 12 },
    quoteButton: { borderWidth: 1, borderColor: c.text, borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
    quoteButtonText: { color: c.text, fontSize: 14, fontWeight: '600' },
    quotePreview: { fontSize: 14, color: c.text, marginTop: 8, textAlign: 'center' },
    button: { backgroundColor: c.primary, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
    buttonText: { color: c.primaryText, fontSize: 16, fontWeight: '600' },
  });
