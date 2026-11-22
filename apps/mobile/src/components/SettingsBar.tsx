import { LOCALES, LOCALE_LABELS } from '@mixmatch/shared';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useT } from '../i18n-context';
import { useTheme, type ThemeMode } from '../theme-context';

const MODES: ThemeMode[] = ['system', 'light', 'dark'];

/** Language and appearance switches, shown on the sign-in screen and in the app header. */
export default function SettingsBar() {
  const { t, locale, setLocale } = useT();
  const { mode, setMode, colors } = useTheme();

  const nextLocale = LOCALES[(LOCALES.indexOf(locale) + 1) % LOCALES.length];
  const nextMode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];

  return (
    <View style={styles.row}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('common.language')}
        onPress={() => setLocale(nextLocale)}
        testID="locale-toggle"
      >
        <Text style={[styles.link, { color: colors.link }]}>{LOCALE_LABELS[locale]}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('common.theme')}
        onPress={() => setMode(nextMode)}
        testID="theme-toggle"
      >
        <Text style={[styles.link, { color: colors.link }]}>{t(`common.theme.${mode}` as const)}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 16, justifyContent: 'flex-end' },
  link: { fontSize: 13 },
});
