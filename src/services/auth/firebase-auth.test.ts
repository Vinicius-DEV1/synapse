import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firebaseAuth from 'firebase/auth';
import {
  signUpWithEmail,
  signInWithEmail,
  signOutUser,
  getCurrentAuthUser,
  subscribeToAuthState,
  sendPasswordReset,
  formatAuthError,
} from './firebase-auth';

vi.mock('../firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn(),
}));

describe('firebase-auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatAuthError', () => {
    it('translates common Firebase Auth error codes to user-friendly Portuguese messages', () => {
      expect(formatAuthError('auth/user-not-found')).toBe('E-mail ou senha incorretos.');
      expect(formatAuthError('auth/wrong-password')).toBe('E-mail ou senha incorretos.');
      expect(formatAuthError('auth/email-already-in-use')).toBe('Este e-mail já está cadastrado em outra conta.');
      expect(formatAuthError('auth/weak-password')).toBe('A senha deve conter no mínimo 6 caracteres.');
      expect(formatAuthError('auth/invalid-email')).toBe('O formato do e-mail inserido é inválido.');
      expect(formatAuthError('unknown-code', 'Custom fallback')).toBe('Custom fallback');
    });
  });

  describe('signUpWithEmail', () => {
    it('fails early with empty email or short password', async () => {
      const resEmpty = await signUpWithEmail('', '123456');
      expect(resEmpty.success).toBe(false);
      expect(resEmpty.error).toContain('e-mail não pode estar vazio');

      const resShort = await signUpWithEmail('test@example.com', '123');
      expect(resShort.success).toBe(false);
      expect(resShort.error).toContain('mínimo 6 caracteres');
    });

    it('returns success and user object when Firebase createUser succeeds', async () => {
      const mockUser = { uid: 'user-123', email: 'vini@example.com' };
      vi.mocked(firebaseAuth.createUserWithEmailAndPassword).mockResolvedValueOnce({
        user: mockUser,
      } as unknown as firebaseAuth.UserCredential);

      const res = await signUpWithEmail('vini@example.com', 'strongPassword123');
      expect(res.success).toBe(true);
      expect(res.user?.uid).toBe('user-123');
      expect(firebaseAuth.createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'vini@example.com',
        'strongPassword123'
      );
    });

    it('formats error gracefully when email already in use', async () => {
      const authErr = new Error('The email address is already in use');
      (authErr as { code?: string }).code = 'auth/email-already-in-use';
      vi.mocked(firebaseAuth.createUserWithEmailAndPassword).mockRejectedValueOnce(authErr);

      const res = await signUpWithEmail('existing@example.com', 'password123');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Este e-mail já está cadastrado em outra conta.');
    });
  });

  describe('signInWithEmail', () => {
    it('fails when email or password is missing', async () => {
      const res = await signInWithEmail('', '');
      expect(res.success).toBe(false);
      expect(res.error).toContain('obrigatórios');
    });

    it('returns user on successful credentials', async () => {
      const mockUser = { uid: 'user-456', email: 'alice@example.com' };
      vi.mocked(firebaseAuth.signInWithEmailAndPassword).mockResolvedValueOnce({
        user: mockUser,
      } as unknown as firebaseAuth.UserCredential);

      const res = await signInWithEmail('alice@example.com', 'secret');
      expect(res.success).toBe(true);
      expect(res.user?.uid).toBe('user-456');
    });

    it('returns formatted error on wrong credentials', async () => {
      const authErr = new Error('Invalid credentials');
      (authErr as { code?: string }).code = 'auth/invalid-credential';
      vi.mocked(firebaseAuth.signInWithEmailAndPassword).mockRejectedValueOnce(authErr);

      const res = await signInWithEmail('alice@example.com', 'wrong');
      expect(res.success).toBe(false);
      expect(res.error).toBe('E-mail ou senha incorretos.');
    });
  });

  describe('signOutUser', () => {
    it('invokes Firebase signOut', async () => {
      vi.mocked(firebaseAuth.signOut).mockResolvedValueOnce();
      await signOutUser();
      expect(firebaseAuth.signOut).toHaveBeenCalled();
    });
  });

  describe('sendPasswordReset', () => {
    it('validates email presence and invokes sendPasswordResetEmail', async () => {
      const resEmpty = await sendPasswordReset('');
      expect(resEmpty.success).toBe(false);

      vi.mocked(firebaseAuth.sendPasswordResetEmail).mockResolvedValueOnce();
      const res = await sendPasswordReset('bob@example.com');
      expect(res.success).toBe(true);
      expect(firebaseAuth.sendPasswordResetEmail).toHaveBeenCalledWith(
        expect.anything(),
        'bob@example.com'
      );
    });
  });

  describe('subscribeToAuthState', () => {
    it('wires callback to onAuthStateChanged', () => {
      const dummyUnsub = vi.fn();
      vi.mocked(firebaseAuth.onAuthStateChanged).mockReturnValueOnce(dummyUnsub);

      const cb = vi.fn();
      const unsub = subscribeToAuthState(cb);
      expect(firebaseAuth.onAuthStateChanged).toHaveBeenCalledWith(expect.anything(), cb);
      unsub();
      expect(dummyUnsub).toHaveBeenCalled();
    });
  });
});
