module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Must be listed last — required by react-native-reanimated (a peer
    // dependency of expo-router).
    plugins: ['react-native-reanimated/plugin'],
  };
};
