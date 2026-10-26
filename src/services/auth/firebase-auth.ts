/**
 * @file firebase-auth.ts
 * @description Multi-user authentication service wrapping Firebase Authentication.
 * Delivers secure sign-up, sign-in, session subscriptions, password reset, and token management.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  type User,
  type Unsubscribe,
} from 'firebase/auth';
import { auth } from '../firebase';
import { getErrorMessage } from '../../utils/error';

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
  code?: string;
}

/**
 * Translates Firebase Auth error codes into clear, user-friendly messages.
 */
export function formatAuthError(code?: string, fallbackMessage?: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'O formato do e-mail inserido é inválido.';
    case 'auth/user-disabled':
      return 'Esta conta de usuário foi desativada pelo administrador.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado em outra conta.';
    case 'auth/weak-password':
      return 'A senha deve conter no mínimo 6 caracteres.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas sem sucesso. Aguarde alguns instantes antes de tentar novamente.';
    case 'auth/network-request-failed':
      return 'Falha na conexão com os servidores de autenticação. Verifique sua internet.';
    default:
      return fallbackMessage || 'Ocorreu um erro durante a autenticação.';
  }
}

/**
 * Creates a new independent user account using email and password.
 */
export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  const cleanEmail = email.trim();
  if (!cleanEmail) {
    return { success: false, error: 'O e-mail não pode estar vazio.' };
  }
  if (!password || password.length < 6) {
    return { success: false, error: 'A senha deve conter no mínimo 6 caracteres.' };
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    return {
      success: true,
      user: userCredential.user,
    };
  } catch (err: unknown) {
    const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : undefined;
    const msg = getErrorMessage(err);
    return {
      success: false,
      error: formatAuthError(code, msg),
      code,
    };
  }
}

/**
 * Signs in an existing user with their email and password credentials.
 */
export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const cleanEmail = email.trim();
  if (!cleanEmail || !password) {
    return { success: false, error: 'E-mail e senha são obrigatórios.' };
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    return {
      success: true,
      user: userCredential.user,
    };
  } catch (err: unknown) {
    const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : undefined;
    const msg = getErrorMessage(err);
    return {
      success: false,
      error: formatAuthError(code, msg),
      code,
    };
  }
}

/**
 * Terminates the current active Firebase Authentication session.
 */
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Returns the currently authenticated Firebase user, or null if unauthenticated.
 */
export function getCurrentAuthUser(): User | null {
  return auth.currentUser;
}

/**
 * Subscribes to real-time changes in user authentication state.
 */
export function subscribeToAuthState(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

/**
 * Sends a password reset email via Firebase Authentication.
 */
export async function sendPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email.trim();
  if (!cleanEmail) {
    return { success: false, error: 'Informe um e-mail válido para redefinição.' };
  }

  try {
    await sendPasswordResetEmail(auth, cleanEmail);
    return { success: true };
  } catch (err: unknown) {
    const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : undefined;
    const msg = getErrorMessage(err);
    return {
      success: false,
      error: formatAuthError(code, msg),
    };
  }
}

/**
 * Updates the user's display name or photo URL.
 */
export async function updateUserProfile(displayName?: string, photoURL?: string): Promise<{ success: boolean; error?: string }> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return { success: false, error: 'Nenhum usuário autenticado.' };
  }

  try {
    await updateProfile(currentUser, {
      displayName: displayName ?? currentUser.displayName,
      photoURL: photoURL ?? currentUser.photoURL,
    });
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * Retrieves the current Firebase Auth ID token (JWT) for secure requests.
 */
export async function getAuthIdToken(forceRefresh = false): Promise<string | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  try {
    return await currentUser.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}

/**
 * Convenience wrappers for UI multi-user authentication flows.
 */
export async function registerWithFirebase(email: string, password: string, displayName?: string): Promise<User> {
  const res = await signUpWithEmail(email, password);
  if (!res.success || !res.user) {
    throw new Error(res.error || 'Falha ao registrar usuário.');
  }
  if (displayName) {
    await updateUserProfile(displayName);
  }
  return res.user;
}

export async function signInWithFirebase(email: string, password: string): Promise<User> {
  const res = await signInWithEmail(email, password);
  if (!res.success || !res.user) {
    throw new Error(res.error || 'Falha ao autenticar.');
  }
  return res.user;
}

export async function signOutFromFirebase(): Promise<void> {
  await signOutUser();
}

export async function resetFirebasePassword(email: string): Promise<void> {
  const res = await sendPasswordReset(email);
  if (!res.success) {
    throw new Error(res.error || 'Falha ao enviar e-mail de redefinição.');
  }
}
