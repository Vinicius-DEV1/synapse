import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldAlert, KeyRound, Timer } from 'lucide-react';
import { useStore } from '../store/useStore';
import { deriveMasterKey, importHexKey, exportKeyToHex } from '../services/crypto';
import { initializeCloudValidator, verifyCloudMasterPassword, pushModularKeysToCloud, pullModularKeysFromCloud, getSecurityLock, recordFailedAttempt, clearFailedAttempts } from '../services/sync';
import { setDriveMasterKey } from '../services/drive';
import { platform } from '../services/platform';

const INTIMIDATING_PHRASES = [
  "Se você usar toda a energia do sol para tentar quebrar essa criptografia AES-256 GCM, o sol vai apagar antes de você conseguir.",
  "O universo vai atingir o zero absoluto e congelar antes de você passar dessa tela. Vá tomar um café.",
  "Força bruta? Sério? Estamos no século 21. A criptografia ri da sua tentativa.",
  "Sua persistência é admirável, mas sua ignorância criptográfica é deplorável. Não vai rolar.",
  "Desista logo. Vá fazer algo mais produtivo do que tentar quebrar o inquebrável."
];

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
    const checkLock = async () => {
      if (isSetup) return;
      const lock = await getSecurityLock();
      if (lock.failedAttempts > 0 && lock.failedAttempts % 3 === 0) {
        const remaining = 15 - Math.floor((Date.now() - lock.lastFailedAt) / 1000);
        if (remaining > 0) {
          setLockoutTime(remaining);
          if (!intimidatingPhrase) {
            setIntimidatingPhrase(INTIMIDATING_PHRASES[Math.floor(Math.random() * INTIMIDATING_PHRASES.length)]);
          }
        } else {
          setLockoutTime(0);
        }
      } else {
        setLockoutTime(0);
      }
    };

    checkLock();
    interval = setInterval(checkLock, 1000);
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
        // Validar na nuvem antes de permitir o setup local
        if (!cloudCheck.isValid) {
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
          let rawKeys = res.keys;
          
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

          const moduleKeys: Record<string, CryptoKey> = {};
          if (rawKeys) {
            moduleKeys.library = rawKeys.library ? await importHexKey(rawKeys.library) : masterKey;
            moduleKeys.finance = rawKeys.finance ? await importHexKey(rawKeys.finance) : masterKey;
            moduleKeys.notes = rawKeys.notes ? await importHexKey(rawKeys.notes) : masterKey;
            moduleKeys.core = masterKey;
            moduleKeys.focus = masterKey;
            moduleKeys.vault = masterKey;
            moduleKeys.culture = masterKey;
            moduleKeys.anki = masterKey;
            moduleKeys.files = masterKey;
            moduleKeys.calendar = masterKey;
            moduleKeys.practice = masterKey;
          } else {
            moduleKeys.library = masterKey;
            moduleKeys.finance = masterKey;
            moduleKeys.notes = masterKey;
            moduleKeys.core = masterKey;
            moduleKeys.focus = masterKey;
            moduleKeys.vault = masterKey;
            moduleKeys.culture = masterKey;
            moduleKeys.anki = masterKey;
            moduleKeys.files = masterKey;
            moduleKeys.calendar = masterKey;
            moduleKeys.practice = masterKey;
          }
          
          if (cloudCheck.isNew) {
            await initializeCloudValidator(masterKey);
          }
          
          dispatch({ type: 'SET_MODULE_KEYS', keys: moduleKeys });
          dispatch({ type: 'SET_MASTER_KEY', key: masterKey });
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

        // Auto-migration: se a senha funcionou na nuvem, mas falhou localmente, atualiza o hash local!
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
          let rawKeys = res.keys;
          
          if (rawKeys) {
            pushModularKeysToCloud(rawKeys, masterKey).catch(e => console.error(e));
          }
          
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
             if (window.api.auth.forceUpdateKeychain) {
               await window.api.auth.forceUpdateKeychain(password, rawKeys);
             }
          } else if (!rawKeys) {
             try {
               rawKeys = await pullModularKeysFromCloud(masterKey);
             } catch (e: any) {
               if (platform.platform === 'web') throw new Error("Conexão com Firebase falhou. App Web bloqueado.");
             }
          }

          const moduleKeys: Record<string, CryptoKey> = {};
          if (rawKeys) {
            moduleKeys.library = rawKeys.library ? await importHexKey(rawKeys.library) : masterKey;
            moduleKeys.finance = rawKeys.finance ? await importHexKey(rawKeys.finance) : masterKey;
            moduleKeys.notes = rawKeys.notes ? await importHexKey(rawKeys.notes) : masterKey;
            moduleKeys.core = masterKey;
            moduleKeys.focus = masterKey;
            moduleKeys.vault = masterKey;
            moduleKeys.culture = masterKey;
            moduleKeys.anki = masterKey;
            moduleKeys.files = masterKey;
            moduleKeys.calendar = masterKey;
            moduleKeys.practice = masterKey;
          } else {
            moduleKeys.library = masterKey;
            moduleKeys.finance = masterKey;
            moduleKeys.notes = masterKey;
            moduleKeys.core = masterKey;
            moduleKeys.focus = masterKey;
            moduleKeys.vault = masterKey;
            moduleKeys.culture = masterKey;
            moduleKeys.anki = masterKey;
            moduleKeys.files = masterKey;
            moduleKeys.calendar = masterKey;
            moduleKeys.practice = masterKey;
          }

          


          dispatch({ type: 'SET_MODULE_KEYS', keys: moduleKeys });
          dispatch({ type: 'SET_MASTER_KEY', key: masterKey });
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
          <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.4)]">
              <Timer size={32} className="text-red-400 animate-pulse" />
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-2 tracking-widest text-red-400">
              00:{lockoutTime.toString().padStart(2, '0')}
            </h1>
            
            <h2 className="text-lg font-medium text-center text-white/90 mb-4 uppercase tracking-wider">
              Acesso Bloqueado
            </h2>
            
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl w-full">
              <p className="text-center text-red-200/90 text-sm leading-relaxed italic font-medium">
                "{intimidatingPhrase}"
              </p>
            </div>
          </div>
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
