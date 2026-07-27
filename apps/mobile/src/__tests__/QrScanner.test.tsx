import { fireEvent, render, screen } from '@testing-library/react-native';
import { QrScanner } from '../components/QrScanner';

const mockRequestPermission = jest.fn();
let mockPermission: { granted: boolean } | null = null;

jest.mock('expo-camera', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text, TouchableOpacity } = require('react-native');
  return {
    CameraView: (props: { onBarcodeScanned?: (event: { data: string }) => void }) => (
      <TouchableOpacity testID="mock-camera" onPress={() => props.onBarcodeScanned?.({ data: 'scanned-data' })}>
        <Text>camera</Text>
      </TouchableOpacity>
    ),
    useCameraPermissions: () => [mockPermission, mockRequestPermission],
  };
});

describe('QrScanner', () => {
  beforeEach(() => {
    mockRequestPermission.mockReset();
    mockPermission = null;
  });

  it('shows a loading state while permission status is unknown', () => {
    render(<QrScanner onScan={jest.fn()} />);
    expect(screen.getByTestId('qr-scanner-loading')).toBeTruthy();
  });

  it('prompts for camera access when permission has not been granted', () => {
    mockPermission = { granted: false };
    render(<QrScanner onScan={jest.fn()} />);

    expect(screen.getByText(/camera access is needed/i)).toBeTruthy();
    fireEvent.press(screen.getByText('Grant camera access'));
    expect(mockRequestPermission).toHaveBeenCalled();
  });

  it('calls onScan with the scanned data once permission is granted', () => {
    mockPermission = { granted: true };
    const onScan = jest.fn();
    render(<QrScanner onScan={onScan} />);

    fireEvent.press(screen.getByTestId('mock-camera'));
    expect(onScan).toHaveBeenCalledWith('scanned-data');
  });
});
