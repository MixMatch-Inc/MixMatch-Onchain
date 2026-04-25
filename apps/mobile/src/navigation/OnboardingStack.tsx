import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from './types';
import { OnboardingWelcomeScreen } from '@/screens/onboarding/OnboardingWelcomeScreen';
import { OnboardingProfileScreen } from '@/screens/onboarding/OnboardingProfileScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OnboardingWelcome" component={OnboardingWelcomeScreen} />
      <Stack.Screen name="OnboardingProfile" component={OnboardingProfileScreen} />
    </Stack.Navigator>
  );
}
