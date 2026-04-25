import React from 'react';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import type { RootStackParamList } from './types';
import { AuthStack } from './AuthStack';
import { OnboardingStack } from './OnboardingStack';
import { MainTabs } from './MainTabs';
import { NotificationScreen } from '@/screens/deeplink/NotificationScreen';
import { SharedTrackScreen } from '@/screens/deeplink/SharedTrackScreen';
import { useSessionStore } from '@/store/session.store';

const Stack = createNativeStackNavigator<RootStackParamList>();

const prefix = Linking.createURL('/');

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [prefix, 'mixmatch://'],
  config: {
    screens: {
      Main: {
        screens: {
          Discovery: 'discovery',
          BlindMode: 'blind',
          Resonances: 'resonances',
          Messages: 'messages',
          Events: 'events',
          Settings: 'settings',
        },
      },
      Notification: 'notification/:notificationId',
      SharedTrack: 'track/:trackId',
    },
  },
};

export function RootNavigator() {
  const { user, isHydrated } = useSessionStore();

  if (!isHydrated) return null;

  const initialRoute: keyof RootStackParamList = !user
    ? 'Auth'
    : !user.onboardingCompleted
      ? 'Onboarding'
      : 'Main';

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Auth" component={AuthStack} />
        <Stack.Screen name="Onboarding" component={OnboardingStack} />
        <Stack.Screen name="Main" component={MainTabs} />
        {/* Deep-link targets */}
        <Stack.Screen name="Notification" component={NotificationScreen} />
        <Stack.Screen name="SharedTrack" component={SharedTrackScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
