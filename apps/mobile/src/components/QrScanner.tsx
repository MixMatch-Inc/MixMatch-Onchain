import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useCallback, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface QrScannerProps {
  onScanned: (data: string) => void;
}

/** Scans a peer's "pay me" QR code (their raw Stellar public key) to prefill a payment. */
export default function QrScanner({ onScanned }: QrScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const hasScannedRef = useRef(false);

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
        <Text style={styles.permissionText}>Camera access is needed to scan a payment QR code.</Text>
        <TouchableOpacity style={styles.button} onPress={() => void requestPermission()} testID="grant-permission-button">
          <Text style={styles.buttonText}>Grant camera access</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 300 },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  permissionText: { textAlign: 'center', marginBottom: 16, color: '#666' },
  button: { backgroundColor: '#000', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
