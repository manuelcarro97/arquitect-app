import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { create } from 'zustand';
import { auth } from './firebase';

export interface CloudUser {
  uid: string;
  name: string;
  email: string;
  photoUrl: string | null;
}

interface AuthState {
  /** "loading" until Firebase says whether a session from a previous visit is still open. */
  status: 'loading' | 'signedOut' | 'signedIn';
  user: CloudUser | null;
}

export const useAuthStore = create<AuthState>()(() => ({ status: 'loading', user: null }));

onAuthStateChanged(auth, (user) => {
  useAuthStore.setState(
    user
      ? {
          status: 'signedIn',
          user: {
            uid: user.uid,
            name: user.displayName ?? user.email ?? 'Usuario',
            email: user.email ?? '',
            photoUrl: user.photoURL,
          },
        }
      : { status: 'signedOut', user: null },
  );
});

/** Opens Google's sign-in window. Closing it without signing in is not an error. */
export async function signIn(): Promise<void> {
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
    throw new Error('No se pudo iniciar sesión con Google.', { cause: error });
  }
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}
