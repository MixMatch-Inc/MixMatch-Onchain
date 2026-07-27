import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { Button, Text, View } from 'react-native';

export interface QrScannerProps {
  onScan: (data: string) => void;
}

/**
 * Wraps expo-camera's barcode scanning for reading payment QR codes.
 * `scanned` gates re-triggering `onScan` for every frame after the first hit.
 */
export function QrScanner({ onScan }: QrScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return <View testID="qr-scanner-loading" />;
  }

  if (!permission.granted) {
    return (
      <View>
        <Text>Camera access is needed to scan payment QR codes.</Text>
        <Button title="Grant camera access" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View accessibilityLabel="QR code scanner" testID="qr-scanner">
      <CameraView
        style={{ flex: 1 }}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={
          scanned
            ? undefined
            : ({ data }) => {
                setScanned(true);
                onScan(data);
              }
        }
      />
      {scanned && <Button title="Scan again" onPress={() => setScanned(false)} />}
    </View>
  );
}
