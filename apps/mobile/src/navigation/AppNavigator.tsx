import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { BlindDiscoveryScreen } from '../screens/BlindDiscoveryScreen';
import { JourneyAuthoringScreen } from '../screens/JourneyAuthoringScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { JourneyPlayerScreen } from '../screens/JourneyPlayerScreen';

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  BlindDiscovery: undefined;
  JourneyAuthoring: { journeyId?: string };
  JourneyPlayer: { journeyId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#111827',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: '700',
          },
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="BlindDiscovery"
              component={BlindDiscoveryScreen}
              options={{
                title: 'Blind Listening',
                headerStyle: {
                  backgroundColor: '#111827',
                },
              }}
            />
            <Stack.Screen
              name="JourneyAuthoring"
              component={JourneyAuthoringScreen}
              options={({ route }) => ({
                title: route.params?.journeyId ? 'Edit Journey' : 'New Journey',
              })}
            />
            <Stack.Screen
              name="JourneyPlayer"
              component={JourneyPlayerScreen}
              options={{
                title: 'Journey Player',
                headerShown: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
