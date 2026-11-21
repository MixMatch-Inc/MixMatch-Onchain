import { Pressable, StyleSheet, Text, View } from 'react-native';

interface StateProps {
  message: string;
  icon?: string;
  action?: { label: string; onPress: () => void };
}

function Box({ message, icon, action, role }: StateProps & { role?: 'alert' }) {
  return (
    <View style={styles.box} accessibilityRole={role}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={styles.message}>{message}</Text>
      {action ? (
        <Pressable accessibilityRole="button" onPress={action.onPress} style={styles.button}>
          <Text style={styles.buttonText}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Empty list placeholder (#1420). */
export function EmptyState(props: StateProps) {
  return <Box icon="∅" {...props} />;
}

/** Failed-load placeholder with a retry action. */
export function ErrorState(props: StateProps) {
  return <Box icon="⚠" role="alert" {...props} />;
}

const styles = StyleSheet.create({
  box: { padding: 24, alignItems: 'center' },
  icon: { fontSize: 28, marginBottom: 8 },
  message: { color: '#374151', textAlign: 'center' },
  button: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1e3a8a' },
  buttonText: { color: '#fff', fontWeight: '600' },
});
