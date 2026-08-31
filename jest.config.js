const expoPreset = require('jest-expo/jest-preset');

module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|react-native-reanimated|firebase|@firebase/.*)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'mjs'],
  transform: {
    ...expoPreset.transform,
    '^.+\\.mjs$': [
      'babel-jest',
      {
        caller: { name: 'metro', bundler: 'metro', platform: 'ios' },
        configFile: require.resolve('expo/internal/babel-preset.js'),
      },
    ],
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^firebase/app$': '<rootDir>/node_modules/firebase/app/dist/index.cjs.js',
    '^firebase/firestore$': '<rootDir>/node_modules/firebase/firestore/dist/index.cjs.js',
    '^firebase/auth$': '<rootDir>/node_modules/firebase/auth/dist/index.cjs.js',
  },
};
