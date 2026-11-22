import { parsePaymentUri, type PaymentRequest } from '@mixmatch/shared';
import { useEffect } from 'react';
import { Linking } from 'react-native';

/**
 * Calls `onRequest` for a payment link that launched the app and for links received while it is running
 * (`mixmatch://pay?...`, SEP-7 `web+stellar:pay?...`). Anything that is not a valid payment link is ignored.
 */
export function usePaymentLinks(onRequest: (request: PaymentRequest) => void): void {
  useEffect(() => {
    let active = true;
    const handle = (url: string | null) => {
      if (!active || !url) return;
      const request = parsePaymentUri(url);
      if (request) onRequest(request);
    };

    Linking.getInitialURL().then(handle).catch(() => undefined);
    const subscription = Linking.addEventListener('url', (event) => handle(event.url));
    return () => {
      active = false;
      subscription.remove();
    };
  }, [onRequest]);
}
