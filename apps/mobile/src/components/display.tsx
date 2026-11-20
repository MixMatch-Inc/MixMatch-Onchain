import { addressHue, formatAmount, truncateAddress, type StatusPresentation, type StatusTone } from '@mixmatch/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// Same foreground/background pairs as the web StatusPill (>= 4.5:1 contrast).
const TONES: Record<StatusTone, { fg: string; bg: string }> = {
  success: { fg: '#0b5d1e', bg: '#dcfce7' },
  warning: { fg: '#7a4a00', bg: '#fef3c7' },
  danger: { fg: '#8f1111', bg: '#fee2e2' },
  info: { fg: '#1e3a8a', bg: '#dbeafe' },
  neutral: { fg: '#374151', bg: '#e5e7eb' },
};

/** Status badge: colour + icon + text (#1418). Takes the shared `StatusPresentation`. */
export function StatusPill({ tone, icon, label }: StatusPresentation) {
  const { fg, bg } = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]} accessibilityLabel={label}>
      <Text style={[styles.pillText, { color: fg }]}>
        {icon} {label}
      </Text>
    </View>
  );
}

export function Amount({ value, assetCode, style }: { value: string | number; assetCode?: string; style?: object }) {
  return (
    <Text style={style}>
      {formatAmount(value)}
      {assetCode ? ` ${assetCode}` : ''}
    </Text>
  );
}

export function Address({ value, style }: { value: string; style?: object }) {
  return (
    <Text style={style} accessibilityLabel={value}>
      {truncateAddress(value)}
    </Text>
  );
}

/**
 * Value with a copy button. The clipboard itself is injected through `onCopy` because the app has no
 * clipboard dependency yet; the caller supplies e.g. `expo-clipboard`'s `setStringAsync`.
 */
export function CopyField({ label, value, onCopy }: { label: string; value: string; onCopy: (value: string) => void | Promise<void> }) {
  return (
    <View style={styles.copyRow}>
      <Text>{label}: {truncateAddress(value, 6, 6)}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Copy ${label}`} onPress={() => void onCopy(value)}>
        <Text style={styles.copy}>Copy</Text>
      </Pressable>
    </View>
  );
}

export function Avatar({ address, size = 32 }: { address: string; size?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: `hsl(${addressHue(address)}, 55%, 35%)` }}
    >
      <Text style={{ color: '#fff', fontWeight: '600' }}>{address.slice(0, 2).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: '600' },
  copyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  copy: { color: '#1e3a8a', fontWeight: '600' },
});
