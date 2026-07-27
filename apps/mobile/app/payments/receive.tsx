import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { QrDisplay } from '../../src/components/QrDisplay';
import { useAuth } from '../../src/context/AuthContext';
import { getMyAccount } from '../../src/services/payments-client';
import { buildPaymentUri } from '../../src/utils/payment-uri';

export default function ReceiveScreen() {
  const { accessToken } = useAuth();
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const { account } = await getMyAccount(accessToken);
        if (!cancelled) setPublicKey(account.publicKey);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load your account');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return (
    <View>
      <Text>Receive a payment</Text>
      {error && <Text accessibilityRole="alert">{error}</Text>}
      {!publicKey && !error && <ActivityIndicator testID="receive-loading" />}
      {publicKey && (
        <>
          <QrDisplay value={buildPaymentUri({ destinationPublicKey: publicKey })} />
          <Text selectable>{publicKey}</Text>
        </>
      )}
    </View>
  );
}
