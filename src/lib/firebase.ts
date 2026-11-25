import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithGooglePopup(rememberMe = true) {
  await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
  return signInWithPopup(auth, googleProvider);
}

export async function registerUserWithEmail(fullName: string, email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (fullName.trim()) {
    await updateProfile(cred.user, { displayName: fullName.trim() });
  }
  try {
    await sendEmailVerification(cred.user);
  } catch (err) {
    console.warn('Email verification dispatch warning:', err);
  }
  return cred;
}

export async function loginUserWithEmail(email: string, password: string, rememberMe = true) {
  await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
  return signInWithEmailAndPassword(auth, email, password);
}

export async function requestPasswordReset(email: string) {
  return sendPasswordResetEmail(auth, email);
}

export async function resendVerificationEmail() {
  if (!auth.currentUser) throw new Error('No signed-in user.');
  return sendEmailVerification(auth.currentUser);
}

export async function logoutFirebase() {
  return signOut(auth);
}

export function formatFirebaseAuthError(error: any): string {
  const code = error?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters with a mix of letters and numbers.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment before trying again.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completion.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not yet enabled in the Firebase Console for this project. You can sign in immediately with Google, or enable Email/Password under Authentication → Sign-in method in Firebase Console.';
    default:
      return error?.message || 'Authentication failed. Please try again.';
  }
}
