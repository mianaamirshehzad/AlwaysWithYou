import { FirebaseError } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { getFirebaseAuth, getFirebaseDb } from './firebase';

export type UserRole = 'child' | 'parent';

export type CreateAccountInput = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

export type SignInInput = {
  email: string;
  password: string;
};

const USERS_COLLECTION = 'users';

export async function createAccount(input: CreateAccountInput): Promise<User> {
  const email = input.email.trim();
  const name = input.name.trim();
  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, email, input.password);
  const user = credential.user;
  await updateProfile(user, { displayName: name });
  await setDoc(doc(getFirebaseDb(), USERS_COLLECTION, user.uid), {
    role: input.role,
    name,
    email,
    createdAt: serverTimestamp(),
  });
  return user;
}

export async function signInWithEmail(input: SignInInput): Promise<User> {
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), input.email.trim(), input.password);
  return credential.user;
}

export async function logOut(): Promise<void> {
  await signOut(getFirebaseAuth());
}

export function getCurrentUser(): User | null {
  return getFirebaseAuth().currentUser;
}

export function subscribeToAuthState(listener: (user: User | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), listener);
}

export async function getUserRole(uid: string): Promise<UserRole | null> {
  const snapshot = await getDoc(doc(getFirebaseDb(), USERS_COLLECTION, uid));
  const data = snapshot.data();
  if (data !== undefined && (data.role === 'child' || data.role === 'parent')) {
    return data.role;
  }
  return null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

export function isValidName(name: string): boolean {
  return name.trim().length > 0;
}

export function getPasswordError(password: string): string | null {
  if (password.length === 0) {
    return 'Please enter a password.';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters.';
  }
  return null;
}

export function getPasswordConfirmationError(password: string, confirmation: string): string | null {
  if (confirmation.length === 0) {
    return 'Please confirm your password.';
  }
  if (confirmation !== password) {
    return 'Passwords do not match.';
  }
  return null;
}

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'auth/email-already-in-use':
        return 'An account already exists with this email.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Email or password is incorrect.';
      case 'auth/network-request-failed':
        return 'Unable to connect. Please check your internet connection and try again.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/operation-not-allowed':
        return 'This sign-in method is not available yet.';
      case 'auth/missing-password':
        return 'Please enter your password.';
      case 'auth/invalid-api-key':
        return 'Authentication is not configured correctly.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
