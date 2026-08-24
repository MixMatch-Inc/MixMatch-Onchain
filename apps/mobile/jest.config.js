// pnpm nests packages under node_modules/.pnpm/<name>@<version>/node_modules/<name>,
// so jest-expo's default `node_modules/(?!react-native|...)` patterns never
// match. Match on package name presence anywhere in the path instead.
const reactNativePackages = [
  '(jest-)?react-native',
  '@react-native(-community)?',
  'expo(nent)?',
  '@expo(nent)?',
  '@expo-google-fonts',
  'react-native-svg',
  'react-native-qrcode-svg',
];

module.exports = {
  preset: 'jest-expo',
  setupFiles: ['./jest.setup.js'],
  transformIgnorePatterns: [`node_modules/(?!.*(${reactNativePackages.join('|')}))`],
};
