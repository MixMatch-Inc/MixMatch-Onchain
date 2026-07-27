import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { QrScanner } from '../../src/components/QrScanner';
import { parsePaymentUri } from '../../src/utils/payment-uri';

export default function ScanScreen() {
  const [error, setError] = useState<string | null>(null);

  const handleScan = (data: string) => {
    const payload = parsePaymentUri(data);
    if (!payload) {
      setError('That QR code is not a valid payment link.');
      return;
    }
    setError(null);
    router.replace({
      pathname: '/payments',
      params: {
        destination: payload.destinationPublicKey,
        ...(payload.amount ? { amount: payload.amount } : {}),
        ...(payload.memo ? { memo: payload.memo } : {}),
      },
    });
  };

  return (
    <View style={{ flex: 1 }}>
      {error && <Text accessibilityRole="alert">{error}</Text>}
      <QrScanner onScan={handleScan} />
    </View>
  );
}
