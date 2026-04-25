import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useBlindListeningStore } from '../store/blindListeningStore';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

export const DashboardScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const blindMode = useBlindListeningStore((s) => s.blindMode);
  const toggleBlind = useBlindListeningStore((s) => s.toggle);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const quickActions = [
    {
      title: 'Blind Discovery',
      subtitle: 'Anonymous DJ profiles - identity protected',
      icon: '👁️‍🗨️',
      route: 'BlindDiscovery',
    },
    {
      title: 'Journey Authoring',
      subtitle: 'Create and edit track sequences',
      icon: '✍️',
      route: 'JourneyAuthoring',
    },
    {
      title: 'Player Demo',
      subtitle: 'Test the journey player',
      icon: '▶️',
      route: 'JourneyPlayer',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Dashboard</Text>
          <TouchableOpacity onPress={clearAuth} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        {/* Blind Mode Toggle */}
        <View style={styles.blindCard}>
          <View style={styles.blindHeader}>
            <View>
              <Text style={styles.blindTitle}>Blind Listening Mode</Text>
              <Text style={styles.blindSubtitle}>
                {blindMode ? 'Active - profiles are anonymous' : 'Inactive - full profiles visible'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.blindToggle, blindMode && styles.blindToggleActive]}
            onPress={toggleBlind}
            activeOpacity={0.8}
          >
            <View style={[styles.toggleKnob, blindMode && styles.toggleKnobActive]} />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.actionsTitle}>Quick Actions</Text>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={action.title}
              style={[styles.actionCard, index === 0 && blindMode && styles.actionCardHighlight]}
              onPress={() => navigation.navigate(action.route as any)}
            >
              <View style={styles.actionIcon}>
                <Text style={styles.actionEmoji}>{action.icon}</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Status Indicator */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>System operational</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#111827',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  blindCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  blindHeader: {
    flex: 1,
  },
  blindTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  blindSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  blindToggle: {
    width: 56,
    height: 32,
    backgroundColor: '#374151',
    borderRadius: 16,
    justifyContent: 'center',
    padding: 3,
  },
  blindToggleActive: {
    backgroundColor: '#059669',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  toggleKnobActive: {
    marginLeft: 24,
  },
  actionsSection: {
    gap: 12,
  },
  actionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  actionCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  actionCardHighlight: {
    borderColor: '#059669',
    backgroundColor: '#1a2b23',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionEmoji: {
    fontSize: 22,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  statusCard: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    color: '#6b7280',
  },
});
