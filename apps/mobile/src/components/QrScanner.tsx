import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useT } from '../i18n-context';
import type { Palette } from '../palette';
import { useTheme } from '../theme-context';

export interface QrScannerProps {
  onScanned: (data: string) => void;
}

/** Scans a peer's "pay me" QR code (their raw Stellar public key) to prefill a payment. */
export default function QrScanner({ onScanned }: QrScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const hasScannedRef = useRef(false);
  const { t } = useT();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (hasScannedRef.current) return;
      hasScannedRef.current = true;
      onScanned(result.data);
    },
    [onScanned],
  );

  if (!permission) {
    return <View style={styles.container} testID="qr-scanner-loading" />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer} testID="qr-scanner-permission">
        <Text style={styles.permissionText}>{t('payments.cameraNeeded')}</Text>
        <TouchableOpacity style={styles.button} onPress={() => void requestPermission()} testID="grant-permission-button">
          <Text style={styles.buttonText}>{t('payments.grantCamera')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <CameraView
      style={styles.container}
      facing="back"
      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      onBarcodeScanned={handleBarcodeScanned}
      testID="qr-camera-view"
    />
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { flex: 1, minHeight: 300 },
    permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    permissionText: { textAlign: 'center', marginBottom: 16, color: c.textMuted },
    button: { backgroundColor: c.primary, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20 },
    buttonText: { color: c.primaryText, fontWeight: '600' },
  });
