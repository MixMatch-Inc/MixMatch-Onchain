import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from './types';
import { DiscoveryScreen } from '@/screens/main/DiscoveryScreen';
import { BlindModeScreen } from '@/screens/main/BlindModeScreen';
import { ResonancesScreen } from '@/screens/main/ResonancesScreen';
import { MessagesScreen } from '@/screens/main/MessagesScreen';
import { EventsScreen } from '@/screens/main/EventsScreen';
import { SettingsScreen } from '@/screens/main/SettingsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Discovery" component={DiscoveryScreen} />
      <Tab.Screen name="BlindMode" component={BlindModeScreen} />
      <Tab.Screen name="Resonances" component={ResonancesScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Events" component={EventsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
