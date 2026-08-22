import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldAlert } from 'lucide-react';
import { useStore } from '../store/useStore';
import { deriveMasterKey, importHexKey, exportKeyToHex } from '../services/crypto';
import { getVaultKeyHash } from '../services/vault-crypto';
import { initializeCloudValidator, verifyCloudMasterPassword, pushModularKeysToCloud, pullModularKeysFromCloud, getSecurityLock, recordFailedAttempt, clearFailedAttempts } from '../services/sync';
import { setDriveMasterKey } from '../services/drive';
import { platform } from '../services/platform';
import { getRandomIntimidatingPhrase } from './auth/AuthSecurityPhrases';
import { AuthLockoutView } from './auth/AuthLockoutView';

async function buildModuleKeys(rawKeys: Record<string, string> | null | undefined, masterKey: CryptoKey): Promise<Record<string, CryptoKey>> {
  const keys: Record<string, CryptoKey> = {};
  const modules = ['library', 'finance', 'notes', 'core', 'focus', 'vault', 'culture', 'anki', 'files', 'calendar', 'practice'];
  
  for (const mod of modules) {
    if (rawKeys && rawKeys[mod]) {
      keys[mod] = await importHexKey(rawKeys[mod]);
    } else {
      keys[mod] = masterKey;
    }
  }
  return keys;
}

// The AuthApi interface (src/api/types.ts) does not declare forceUpdateKeychain, but both
// tauriAuthApi (src/api/tauri/auth.ts) quanto webAuthApi (src/api/web/auth.ts) o implementam.
type AuthApiWithKeychain = typeof window.api.auth & {
  forceUpdateKeychain?: (password: string, keys: Record<string, string>) => Promise<{ success: boolean; error?: string }>;
};

interface AuthScreenProps {
  status: 'new' | 'unencrypted' | 'encrypted' | 'error';
  onSuccess: () => void;
}

export default function AuthScreen({ status, onSuccess }: AuthScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [lockoutTime, setLockoutTime] = useState<number>(0);
  const [intimidatingPhrase, setIntimidatingPhrase] = useState('');
  const { dispatch } = useStore();

  // If status is unencrypted, we are setting up a master password and migrating.
  // If status is new, we are just creating it.
  // If status is encrypted, we are logging in.
  const isSetup = status === 'new' || status === 'unencrypted';

  React.useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let localLock: { failedAttempts: number, lastFailedAt: number } | null = null;

    const initLock = async () => {
      if (isSetup) return;
      localLock = await getSecurityLock();
      updateLockout();
    };

    const updateLockout = () => {
      if (!localLock) return;
      if (localLock.failedAttempts > 0 && localLock.failedAttempts % 3 === 0) {
        const remaining = 15 - Math.floor((Date.now() - localLock.lastFailedAt) / 1000);
        if (remaining > 0) {
          setLockoutTime(remaining);
          if (!intimidatingPhrase) {
            setIntimidatingPhrase(getRandomIntimidatingPhrase());
          }
        } else {
          setLockoutTime(0);
        }
      } else {
        setLockoutTime(0);
      }
    };

    initLock();
    interval = setInterval(updateLockout, 1000);
    return () => clearInterval(interval);
  }, [isSetup, intimidatingPhrase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTime > 0) return;

    if (!password.trim()) {
      triggerError('A senha não pode estar vazia');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cloudCheck = await verifyCloudMasterPassword(password);

      if (platform.platform === 'web' && (cloudCheck.error === 'offline' || cloudCheck.error === 'timeout')) {
        triggerError('O App Web requer conexão com a internet ativa.');
        setLoading(false);
        return;
      }

      if (isSetup) {
        // Validar na nuvem antes de permitir o setup local (apenas se a nuvem respondeu com senha invalida)
        if (!cloudCheck.isValid && cloudCheck.error !== 'timeout' && cloudCheck.error !== 'offline') {
          triggerError('Senha incompatível com a sua Nuvem (Firebase).');
          setLoading(false);
          return;
        }

        const masterKey = await deriveMasterKey(password);
        const masterHex = await exportKeyToHex(masterKey);
        
        let existingKeysToUse: Record<string, string> = {
          library: masterHex,
          finance: masterHex,
          notes: masterHex,
          core: masterHex,
          focus: masterHex,
          vault: masterHex,
          culture: masterHex,
          anki: masterHex,
          files: masterHex,
          calendar: masterHex,
          practice: masterHex
        };

        if (!cloudCheck.isNew) {
           let pulled = null;
           try {
             pulled = await pullModularKeysFromCloud(masterKey);
           } catch (e: any) {
             if (platform.platform === 'web') throw new Error("Conexão com Firebase falhou (Timeout). App Web bloqueado.");
           }
           if (pulled) {
             existingKeysToUse = { ...existingKeysToUse, ...pulled };
           }
        }

        const res = await window.api.auth.setup(password, existingKeysToUse);
        if (res.success) {
          let rawKeys: Record<string, string> | null | undefined = res.keys;

          if (rawKeys) {
            if (cloudCheck.isNew) {
              pushModularKeysToCloud(rawKeys, masterKey).catch(e => console.error(e));
            }
          } else {
             try {
               rawKeys = existingKeysToUse || await pullModularKeysFromCloud(masterKey);
             } catch (e: any) {
               if (platform.platform === 'web') throw new Error("Conexão com Firebase falhou. App Web bloqueado.");
               rawKeys = existingKeysToUse;
             }
          }

          const moduleKeys = await buildModuleKeys(rawKeys, masterKey);
          
          if (cloudCheck.isNew) {
            await initializeCloudValidator(masterKey);
          }
          
          const vaultKeyHash = await getVaultKeyHash(password);
          (window as any).__cadernoVaultKey = (rawKeys && rawKeys.vault) ? rawKeys.vault : vaultKeyHash;
          
          dispatch({ type: 'SET_MODULE_KEYS', keys: moduleKeys });
          if (window.api._setMasterKey) {
            window.api._setMasterKey(masterKey);
          }
          setDriveMasterKey(masterKey);
          onSuccess();
        } else {
          triggerError(res.error || 'Erro ao configurar senha');
        }
      } else {
        let res = await window.api.auth.login(password);

        // Auto-migration: if password succeeded on cloud but failed locally, update local hash
        if (!res.success && navigator.onLine && cloudCheck.isValid && !cloudCheck.isNew) {
          console.log("☁️ Senha validada na nuvem! Atualizando hash local desatualizado...");
          const fixRes = await window.api.auth.setup(password);
          if (fixRes.success) {
            res = { success: true };
          }
        }

        if (res.success) {
          await clearFailedAttempts();
          const masterKey = await deriveMasterKey(password);
          let rawKeys: Record<string, string> | null | undefined = res.keys;

          let cloudKeys = null;
          try {
            cloudKeys = await pullModularKeysFromCloud(masterKey);
          } catch (e: any) {
            if (platform.platform === 'web') {
              throw new Error("O App Web não permite acesso offline. O Firebase não respondeu.");
            }
          }

          if (cloudKeys) {
             rawKeys = cloudKeys;
             const authApi = window.api.auth as AuthApiWithKeychain;
             if (authApi.forceUpdateKeychain) {
               await authApi.forceUpdateKeychain(password, rawKeys);
             }
          } else if (!rawKeys) {
             try {
               rawKeys = await pullModularKeysFromCloud(masterKey);
             } catch (e: any) {
               if (platform.platform === 'web') throw new Error("Conexão com Firebase falhou. App Web bloqueado.");
             }
          }

          const moduleKeys = await buildModuleKeys(rawKeys, masterKey);

          // BUGFIX: If vault key exists in rawKeys (cloud), use it for backward compatibility
          // with older vaults that used original password instead of new one (if changed).
          const vaultKeyHash = await getVaultKeyHash(password);
          (window as any).__cadernoVaultKey = (rawKeys && rawKeys.vault) ? rawKeys.vault : vaultKeyHash;

          dispatch({ type: 'SET_MODULE_KEYS', keys: moduleKeys });
          if (window.api._setMasterKey) {
            window.api._setMasterKey(masterKey);
          }
          setDriveMasterKey(masterKey);
          onSuccess();
        } else {
          const newLock = await recordFailedAttempt();
          if (newLock.failedAttempts > 0 && newLock.failedAttempts % 3 === 0) {
            setLockoutTime(15);
            setIntimidatingPhrase(INTIMIDATING_PHRASES[Math.floor(Math.random() * INTIMIDATING_PHRASES.length)]);
            triggerError('Acesso bloqueado por tentativas excessivas');
          } else {
            triggerError(res.error || `Senha incorreta. (${newLock.failedAttempts % 3}/3)`);
          }
        }
      }
    } catch (err: any) {
      triggerError(err.message || 'Erro ao processar');
    } finally {
      setLoading(false);
    }
  };

  const triggerError = (msg: string) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  return (
    <div className="min-h-screen bg-[#0f0e17] flex items-center justify-center p-4" style={{ minHeight: '100dvh' }}>
      <div 
        className={`bg-dark-card border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl transition-all ${shake ? 'animate-shake' : ''} ${lockoutTime > 0 ? 'border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.15)] bg-[#1a0f0f]' : ''}`}
      >
        {lockoutTime > 0 ? (
          <AuthLockoutView
            lockoutTime={lockoutTime}
            intimidatingPhrase={intimidatingPhrase}
          />
        ) : (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-white/40">
                <Lock size={20} />
              </div>
            </div>

            <h1 className="text-xl font-medium text-center text-white mb-2">
              {isSetup ? 'Configuração Inicial' : 'Bem-vindo de volta'}
            </h1>
            
            <p className="text-center text-dark-subtext mb-8 text-sm">
              {isSetup 
                ? 'Defina uma senha de acesso para continuar.' 
                : 'Por favor, insira sua senha para acessar.'}
            </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-dark-subtext mb-1 ml-1 uppercase tracking-wider">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoFocus
              className="w-full bg-dark-bg border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all placeholder:text-white/10"
              placeholder="Sua senha secreta..."
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white/10 hover:bg-white/15 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-pulse">Processando...</span>
            ) : (
              <>
                {isSetup ? 'Salvar Senha' : 'Acessar'}
                <ArrowRight size={18} className="opacity-50" />
              </>
            )}
          </button>
        </form>
        </>
        )}
      </div>
    </div>
  );
}
