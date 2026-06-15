// pnpm nests packages under node_modules/.pnpm/<name>@<version>/node_modules/<name>,
// so jest-expo's default `node_modules/(?!react-native|...)` patterns never
// match. Match on package name presence anywhere in the path instead.
const reactNativePackages = [
  '(jest-)?react-native',
  '@react-native(-community)?',
  'expo(nent)?',
  '@expo(nent)?',
  '@expo-google-fonts',
  'react-navigation',
  '@react-navigation',
  '@sentry/react-native',
  'native-base',
  'react-native-svg',
];

module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    `node_modules/(?!.*(${reactNativePackages.join('|')}))`,
  ],
};
