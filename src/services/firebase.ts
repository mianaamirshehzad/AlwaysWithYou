import AsyncStorage from '@react-native-async-storage/async-storage';
import { getReactNativePersistence } from '@firebase/auth';
import { getApps, getApp, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { Platform } from 'react-native';

// getReactNativePersistence is not part of the default @firebase/auth type
// entry, so it is declared here. At runtime it resolves to the React Native
// entry of @firebase/auth on native platforms and is never invoked on web.
type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

declare module '@firebase/auth' {
  export function getReactNativePersistence(storage: AsyncStorageLike): Persistence;
}

// IMPORTANT: These values must be read via STATIC `process.env.EXPO_PUBLIC_*`
// member expressions so that Expo/Metro can inline them into the bundle at
// build time. Using dynamic access such as `process.env[key]` (key held in a
// variable) is NOT inlined by Expo, and would be empty at runtime in a
// standalone build. All of these are Firebase WEB CLIENT configuration values,
// which are designed to be embedded in a client app (not secret credentials).
const FIREBASE_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
} as const;

function validateFirebaseConfig(): void {
  const entries = Object.entries(FIREBASE_CONFIG) as [
    keyof typeof FIREBASE_CONFIG,
    string | undefined
  ][];
  const missing = entries
    .filter(([, value]) => !value)
    .map(([key]) => `EXPO_PUBLIC_FIREBASE_${key.toUpperCase()}`);
  if (missing.length > 0) {
    throw new Error(
      `Firebase configuration is incomplete. Missing: ${missing.join(
        ', '
      )}. Add the Firebase web configuration values to the EAS environment (see .env.example).`
    );
  }
}

function readFirebaseConfig(): FirebaseOptions {
  validateFirebaseConfig();
  return {
    apiKey: FIREBASE_CONFIG.apiKey as string,
    authDomain: FIREBASE_CONFIG.authDomain as string,
    projectId: FIREBASE_CONFIG.projectId as string,
    storageBucket: FIREBASE_CONFIG.storageBucket as string,
    messagingSenderId: FIREBASE_CONFIG.messagingSenderId as string,
    appId: FIREBASE_CONFIG.appId as string,
  };
}

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firebaseDb: Firestore | null = null;

function getFirebaseApp(): FirebaseApp {
  if (firebaseApp === null) {
    firebaseApp = getApps().length === 0 ? initializeApp(readFirebaseConfig()) : getApp();
  }
  return firebaseApp;
}

function getFirebaseAuth(): Auth {
  if (firebaseAuth === null) {
    const app = getFirebaseApp();
    firebaseAuth =
      Platform.OS === 'web'
        ? getAuth(app)
        : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  }
  return firebaseAuth;
}

function getFirebaseDb(): Firestore {
  if (firebaseDb === null) {
    firebaseDb = getFirestore(getFirebaseApp());
  }
  return firebaseDb;
}

export { getFirebaseApp, getFirebaseAuth, getFirebaseDb };
