import QRCode from 'react-native-qrcode-svg';
import { Text, View } from 'react-native';

export interface QrDisplayProps {
  value: string;
  size?: number;
  label?: string;
}

export function QrDisplay({ value, size = 220, label }: QrDisplayProps) {
  return (
    <View accessibilityLabel="Payment QR code" testID="qr-display">
      <QRCode value={value} size={size} />
      {label && <Text>{label}</Text>}
    </View>
  );
}
