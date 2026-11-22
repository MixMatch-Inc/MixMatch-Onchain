import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

/**
 * Lightweight component playground for React Native (#1422): render the component under work in the
 * `EXAMPLES` list, then open it with `EXPO_PUBLIC_PLAYGROUND=1 pnpm --filter mobile dev` by rendering
 * `<PlaygroundScreen />` from App.tsx. Not shipped to users unless that screen is rendered.
 */
const EXAMPLES: Array<{ title: string; render: () => React.ReactElement }> = [
  { title: 'Text', render: () => <Text>Hello MixMatch</Text> },
];

export function PlaygroundScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {EXAMPLES.map((example) => (
        <View key={example.title} style={styles.section}>
          <Text style={styles.title}>{example.title}</Text>
          {example.render()}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  section: { marginBottom: 24 },
  title: { fontWeight: '600', marginBottom: 8 },
});
