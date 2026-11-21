import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuthLockout } from './useAuthLockout';
import { useStoreDispatch } from '../../store/useStore';
import { getVaultKeyHash } from '../../services/vault-crypto';
import { setDriveMasterKey } from '../../services/drive';
import { setWebVaultKey } from '../../api/web/vault';
import {
  getCurrentAuthUser,
  registerWithFirebase,
  resetFirebasePassword,
  signInWithFirebase,
} from '../../services/auth/firebase-auth';
import {
  LegacyVaultMigrationRequired,
  migrateLegacyVaultToAccountPassword,
  PreviousVaultCredentialInvalid,
  unlockWithAccountPassword,
  type AccountVaultSession,
} from '../../services/auth/account-vault';
import { clearFailedAttempts, recordFailedAttempt } from '../../services/sync';
import { useI18n } from '../../i18n';
import {
  clearRememberedEmail,
  loadRememberedEmail,
  maskEmailAddress,
  saveRememberedEmail,
} from './emailMask';

type CloudMode = 'login' | 'register';

export interface AuthScreenModel {
  isSetup: boolean;
  lockoutTime: number;
  intimidatingPhrase: string;
  cloudMode: CloudMode;
  email: string;
  maskedEmail: string;
  isEmailMasked: boolean;
  rememberEmail: boolean;
  cloudPassword: string;
  previousPassword: string;
  cloudMessage: string;
  error: string;
  loading: boolean;
  shake: boolean;
  migrationRequired: boolean;
  recoveryWarning: boolean;
  setEmail: (value: string) => void;
  toggleRememberEmail: (checked: boolean) => void;
  switchToCustomEmail: () => void;
  setCloudPassword: (value: string) => void;
  setPreviousPassword: (value: string) => void;
  changeCloudMode: (mode: CloudMode) => void;
  handleCloudSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleLegacyMigration: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleForgotPassword: () => Promise<void>;
  cancelLegacyMigration: () => void;
}

export function useAuthScreenController(
  status: 'new' | 'unencrypted' | 'encrypted' | 'error',
  onSuccess: () => void,
): AuthScreenModel {
  const { t } = useI18n();
  const dispatch = useStoreDispatch();
  const isSetup = status === 'new' || status === 'unencrypted';
  const { lockoutTime, intimidatingPhrase, triggerImmediateLockout } = useAuthLockout(isSetup);
  const initialRememberedRef = useRef<string | null>(null);
  if (initialRememberedRef.current === null) {
    initialRememberedRef.current = loadRememberedEmail();
  }
  const [cloudMode, setCloudMode] = useState<CloudMode>('login');
  const [rememberEmail, setRememberEmail] = useState(() => Boolean(initialRememberedRef.current));
  const [email, setEmail] = useState(() => initialRememberedRef.current ?? '');
  const [isEmailMasked, setIsEmailMasked] = useState(() => Boolean(initialRememberedRef.current));
  const [cloudPassword, setCloudPassword] = useState('');
  const [previousPassword, setPreviousPassword] = useState('');
  const [cloudMessage, setCloudMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [recoveryWarning, setRecoveryWarning] = useState(false);
  const rememberedEmailRef = useRef(initialRememberedRef.current ?? '');
  const accountPasswordRef = useRef<string | null>(null);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    accountPasswordRef.current = null;
  }, []);

  const triggerError = (message: string): void => {
    setError(message);
    setShake(true);
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    shakeTimerRef.current = setTimeout(() => setShake(false), 500);
  };

  const finishUnlock = async (session: AccountVaultSession, accountPassword: string): Promise<void> => {
    const trimmedEmail = email.trim();
    if (rememberEmail && trimmedEmail) {
      saveRememberedEmail(trimmedEmail);
      rememberedEmailRef.current = trimmedEmail;
    } else {
      clearRememberedEmail();
      rememberedEmailRef.current = '';
    }
    const vaultKeyHash = await getVaultKeyHash(accountPassword);
    setWebVaultKey(session.rawModuleKeys.vault || vaultKeyHash);
    dispatch({ type: 'SET_MODULE_KEYS', keys: session.moduleKeys });
    dispatch({ type: 'SET_MASTER_KEY', key: session.accountKey });
    window.api._setMasterKey?.(session.accountKey);
    setDriveMasterKey(session.accountKey);
    await clearFailedAttempts();
    accountPasswordRef.current = null;
    setCloudPassword('');
    setPreviousPassword('');
    setMigrationRequired(false);
    onSuccess();
  };

  const handleCloudSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (lockoutTime > 0) return;
    if (!email.trim() || !cloudPassword) {
      triggerError(t('auth.cloudRequiredFields'));
      return;
    }

    const accountPassword = cloudPassword;
    setLoading(true);
    setError('');
    setCloudMessage('');
    setRecoveryWarning(false);
    try {
      const currentUser = getCurrentAuthUser();
      const hasCachedAccount = currentUser?.email?.toLowerCase() === email.trim().toLowerCase();
      if (navigator.onLine || !hasCachedAccount) {
        if (cloudMode === 'register') await registerWithFirebase(email, accountPassword);
        else await signInWithFirebase(email, accountPassword);
      }

      try {
        const session = await unlockWithAccountPassword(accountPassword);
        await finishUnlock(session, accountPassword);
      } catch (unlockError: unknown) {
        if (!(unlockError instanceof LegacyVaultMigrationRequired)) throw unlockError;
        accountPasswordRef.current = accountPassword;
        setMigrationRequired(true);
        setCloudMessage(t('auth.legacyMigrationRequired'));
        setPreviousPassword('');
      }
    } catch (submitError: unknown) {
      const message = submitError instanceof Error ? submitError.message : t('auth.authenticationFailed');
      triggerError(message);
    } finally {
      setCloudPassword('');
      setLoading(false);
    }
  };

  const handleLegacyMigration = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (lockoutTime > 0) return;
    const accountPassword = accountPasswordRef.current;
    if (!accountPassword) {
      setMigrationRequired(false);
      triggerError(t('auth.signInAgainToMigrate'));
      return;
    }
    if (!previousPassword) {
      triggerError(t('auth.previousCredentialRequired'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const session = await migrateLegacyVaultToAccountPassword(accountPassword, previousPassword);
      await finishUnlock(session, accountPassword);
    } catch (migrationError: unknown) {
      if (migrationError instanceof PreviousVaultCredentialInvalid) {
        const lock = await recordFailedAttempt();
        if (lock.failedAttempts > 0 && lock.failedAttempts % 3 === 0) {
          triggerImmediateLockout(15);
        }
      }
      const message = migrationError instanceof PreviousVaultCredentialInvalid
        ? t('auth.previousCredentialInvalid')
        : migrationError instanceof Error ? migrationError.message : t('auth.migrationFailed');
      triggerError(message);
    } finally {
      setPreviousPassword('');
      setLoading(false);
    }
  };

  const handleForgotPassword = async (): Promise<void> => {
    if (!email.trim()) {
      triggerError(t('auth.emailRequiredForRecovery'));
      return;
    }
    if (!recoveryWarning) {
      setRecoveryWarning(true);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await resetFirebasePassword(email);
      setCloudMessage(t('auth.recoveryEmailSent'));
      setRecoveryWarning(false);
    } catch (recoveryError: unknown) {
      const message = recoveryError instanceof Error ? recoveryError.message : t('auth.recoveryFailed');
      triggerError(message);
    } finally {
      setLoading(false);
    }
  };

  const cancelLegacyMigration = (): void => {
    accountPasswordRef.current = null;
    setMigrationRequired(false);
    setPreviousPassword('');
    setCloudMessage('');
    setError('');
  };

  const changeCloudMode = (mode: CloudMode): void => {
    setCloudMode(mode);
    setError('');
    setCloudMessage('');
    if (mode === 'register' && isEmailMasked) {
      setIsEmailMasked(false);
      setEmail('');
    } else if (mode === 'login' && !email.trim() && rememberEmail && rememberedEmailRef.current) {
      setEmail(rememberedEmailRef.current);
      setIsEmailMasked(true);
    }
  };

  const toggleRememberEmail = (checked: boolean): void => {
    setRememberEmail(checked);
    if (!checked) {
      clearRememberedEmail();
      rememberedEmailRef.current = '';
    }
  };

  const switchToCustomEmail = (): void => {
    setIsEmailMasked(false);
    setEmail('');
    setError('');
  };

  return {
    isSetup,
    lockoutTime,
    intimidatingPhrase,
    cloudMode,
    email,
    maskedEmail: maskEmailAddress(email),
    isEmailMasked,
    rememberEmail,
    cloudPassword,
    previousPassword,
    cloudMessage,
    error,
    loading,
    shake,
    migrationRequired,
    recoveryWarning,
    setEmail,
    toggleRememberEmail,
    switchToCustomEmail,
    setCloudPassword,
    setPreviousPassword,
    changeCloudMode,
    handleCloudSubmit,
    handleLegacyMigration,
    handleForgotPassword,
    cancelLegacyMigration,
  };
}
