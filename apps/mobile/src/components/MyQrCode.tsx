import { buildPaymentUri } from '@mixmatch/shared';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useT } from '../i18n-context';
import type { Palette } from '../palette';
import { useTheme } from '../theme-context';

export interface MyQrCodeProps {
  publicKey: string;
}

/**
 * Renders the caller's own Stellar public key as a scannable "pay me" QR code. The QR holds a versioned
 * payment link (`mixmatch://pay?v=1&to=...`, see `@mixmatch/shared` payment-uri) and can carry an optional
 * amount and memo; the scanner and the OS deep-link handler both understand it, as does the old bare key.
 * Never encodes the encrypted secret, which stays on the server in this app's custodial model.
 */
export default function MyQrCode({ publicKey }: MyQrCodeProps) {
  const { t } = useT();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');

  const uri = useMemo(
    () => buildPaymentUri({ destination: publicKey, amount: /^\d+(\.\d{1,7})?$/.test(amount) ? amount : undefined, memo: memo.trim().slice(0, 28) || undefined }),
    [publicKey, amount, memo],
  );

  return (
    <View style={styles.container} testID="my-qr-code">
      {/* The QR is always drawn dark on white so it stays scannable in dark mode. */}
      <View style={styles.qrFrame}>
        <QRCode value={uri} size={220} backgroundColor="#ffffff" color="#000000" />
      </View>
      <Text style={styles.publicKey} selectable numberOfLines={1}>
        {publicKey}
      </Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        placeholder={t('payments.requestAmount')}
        placeholderTextColor={colors.placeholder}
        keyboardType="decimal-pad"
        accessibilityLabel={t('payments.requestAmount')}
        testID="request-amount-input"
      />
      <TextInput
        style={styles.input}
        value={memo}
        onChangeText={setMemo}
        placeholder={t('payments.requestMemo')}
        placeholderTextColor={colors.placeholder}
        maxLength={28}
        accessibilityLabel={t('payments.requestMemo')}
        testID="request-memo-input"
      />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { alignItems: 'center', padding: 24 },
    qrFrame: { backgroundColor: '#ffffff', padding: 12, borderRadius: 8 },
    publicKey: { marginTop: 16, fontSize: 12, color: c.textMuted },
    input: {
      alignSelf: 'stretch',
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      padding: 10,
      marginTop: 12,
      color: c.text,
    },
  });
