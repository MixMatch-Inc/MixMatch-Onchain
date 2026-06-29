import { StyleSheet, Text, View } from 'react-native';

/**
 * Placeholder root component. This establishes the project foundation only;
 * screens, navigation, and features are intentionally not implemented yet.
 */
export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>TheMixMatch Onchain</Text>
      <Text>Mobile foundation</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
});
