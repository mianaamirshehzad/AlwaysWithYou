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

function requireEnvValue(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing Firebase configuration: ${key}. Add the Firebase web configuration values to a .env file (see .env.example).`
    );
  }
  return value;
}

function readFirebaseConfig(): FirebaseOptions {
  return {
    apiKey: requireEnvValue('EXPO_PUBLIC_FIREBASE_API_KEY'),
    authDomain: requireEnvValue('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: requireEnvValue('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
    storageBucket: requireEnvValue('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: requireEnvValue('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
    appId: requireEnvValue('EXPO_PUBLIC_FIREBASE_APP_ID'),
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
