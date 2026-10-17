/**
 * Jest configuration for the P0 end-to-end integration suite.
 *
 * The suite runs the real application services against the Firebase Emulator
 * Suite. It deliberately uses a plain Node environment so that the Firebase
 * SDK resolves its Node (gRPC) transport, which is the only transport that can
 * reach the local emulator from Jest. React Native / Expo modules are replaced
 * with minimal stubs; everything under test is the real source.
 *
 * Run with:  npm run test:integration
 */
module.exports = {
  testEnvironment: 'node',
  rootDir: __dirname,
  testMatch: ['<rootDir>/src/__tests__/integration/**/*.test.ts'],
  testTimeout: 60000,
  // The Firebase SDK keeps long-lived emulator connections open; the suite
  // terminates them through `emulators:exec` when the process exits.
  forceExit: true,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'mjs'],
  setupFiles: ['<rootDir>/jest.integration.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|firebase|@firebase/.*)',
  ],
  moduleNameMapper: {
    '^react-native$': '<rootDir>/tests/stubs/react-native.js',
    '^expo-notifications$': '<rootDir>/tests/stubs/expo-notifications.js',
    '^expo-linking$': '<rootDir>/tests/stubs/expo-linking.js',
    '^expo-crypto$': '<rootDir>/tests/stubs/expo-crypto.js',
    '^expo-constants$': '<rootDir>/tests/stubs/expo-constants.js',
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/tests/stubs/async-storage.js',
  },
  transform: {
    '^.+\\.[jt]sx?$': [
      'babel-jest',
      {
        presets: [
          [
            require.resolve('expo/node_modules/babel-preset-expo'),
            { jsxRuntime: 'automatic' },
          ],
        ],
      },
    ],
  },
};