import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { registerDeviceToken } from './security-client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(accessToken: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('payments', {
      name: 'Payment updates',
      importance: Notifications.AndroidImportance.HIGH,
    });
    await Notifications.setNotificationChannelAsync('matches', {
      name: 'Matches',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.granted
    ? existing
    : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return null;

  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) return null;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await registerDeviceToken(token, accessToken, Platform.OS);
  return token;
}

export function listenForNotifications(
  onReceived?: (notification: Notifications.Notification) => void,
): () => void {
  const received = Notifications.addNotificationReceivedListener((notification) => {
    onReceived?.(notification);
  });
  const response = Notifications.addNotificationResponseReceivedListener(() => {
    void Notifications.dismissAllNotificationsAsync();
  });
  return () => {
    received.remove();
    response.remove();
  };
}
