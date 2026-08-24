import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export interface MyQrCodeProps {
  publicKey: string;
}

/**
 * Renders the caller's own Stellar public key as a scannable "pay me" QR
 * code. Encodes the raw public key only — never the encrypted secret, which
 * never leaves the server in this app's custodial model (see
 * `apps/api/src/modules/payments/wallet-encryption.ts`).
 */
export default function MyQrCode({ publicKey }: MyQrCodeProps) {
  return (
    <View style={styles.container} testID="my-qr-code">
      <QRCode value={publicKey} size={220} />
      <Text style={styles.publicKey} selectable numberOfLines={1}>
        {publicKey}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 24 },
  publicKey: { marginTop: 16, fontSize: 12, color: '#666' },
});
