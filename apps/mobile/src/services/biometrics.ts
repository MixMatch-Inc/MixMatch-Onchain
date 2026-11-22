import * as LocalAuthentication from 'expo-local-authentication';

export async function isBiometricAvailable(): Promise<boolean> {
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hasHardware && isEnrolled;
}

export async function promptBiometric(message: string): Promise<boolean> {
  const available = await isBiometricAvailable();
  if (!available) {
    throw new Error('No biometric authentication is configured on this device.');
  }
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: message,
    fallbackLabel: 'Use passcode',
    disableDeviceFallback: false,
  });
  if (!result.success) {
    throw new Error(result.error === 'user_cancel' ? 'Authentication cancelled.' : 'Biometric authentication failed.');
  }
  return true;
}
