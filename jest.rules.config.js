/**
 * Jest configuration for the Firestore security-rules suite.
 *
 * Kept separate from jest.config.js so `npm test` stays emulator-free and the
 * unit tests keep running without Java or the Firebase CLI installed.
 */
module.exports = {
  testEnvironment: 'node',
  rootDir: __dirname,
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  testTimeout: 30000,
};