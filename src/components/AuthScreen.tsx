import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldAlert, KeyRound } from 'lucide-react';
import { useStore } from '../store/useStore';
import { deriveMasterKey, importHexKey } from '../services/crypto';
import { verifyCloudMasterPassword, initializeCloudValidator } from '../services/sync';

interface AuthScreenProps {
  status: 'new' | 'unencrypted' | 'encrypted' | 'error';
  onSuccess: () => void;
}

export default function AuthScreen({ status, onSuccess }: AuthScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const { dispatch } = useStore();

  // If status is unencrypted, we are setting up a master password and migrating.
  // If status is new, we are just creating it.
  // If status is encrypted, we are logging in.
  const isSetup = status === 'new' || status === 'unencrypted';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      triggerError('A senha não pode estar vazia');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isSetup) {
        // Validar na nuvem antes de permitir o setup local
        const cloudCheck = await verifyCloudMasterPassword(password);
        if (!cloudCheck.isValid) {
          triggerError('Senha incompatível com a sua Nuvem (Firebase).');
          setLoading(false);
          return;
        }

        const res = await window.api.auth.setup(password);
        if (res.success && res.keys) {
          const moduleKeys: Record<string, CryptoKey> = {};
          if (res.keys.library) moduleKeys.library = await importHexKey(res.keys.library);
          if (res.keys.finance) moduleKeys.finance = await importHexKey(res.keys.finance);
          if (res.keys.notes) moduleKeys.notes = await importHexKey(res.keys.notes);

          const masterKey = await deriveMasterKey(password);
          
          if (cloudCheck.isNew) {
            await initializeCloudValidator(masterKey);
          }
          
          dispatch({ type: 'SET_MODULE_KEYS', keys: moduleKeys });
          dispatch({ type: 'SET_MASTER_KEY', key: masterKey });
          if (window.api._setMasterKey) {
            window.api._setMasterKey(masterKey);
          }
          onSuccess();
        } else {
          triggerError(res.error || 'Erro ao configurar senha');
        }
      } else {
        const res = await window.api.auth.login(password);
        if (res.success && res.keys) {
          const moduleKeys: Record<string, CryptoKey> = {};
          if (res.keys.library) moduleKeys.library = await importHexKey(res.keys.library);
          if (res.keys.finance) moduleKeys.finance = await importHexKey(res.keys.finance);
          if (res.keys.notes) moduleKeys.notes = await importHexKey(res.keys.notes);

          const masterKey = await deriveMasterKey(password);
          
          // FORÇAR A CURA DO VALIDADOR NA NUVEM
          // Toda vez que você faz um login com sucesso no seu app principal,
          // ele re-envia o validador para a nuvem usando a sua senha correta,
          // sobrescrevendo qualquer validador corrompido que tenha sido feito.
          initializeCloudValidator(masterKey).catch(e => console.error(e));

          dispatch({ type: 'SET_MODULE_KEYS', keys: moduleKeys });
          dispatch({ type: 'SET_MASTER_KEY', key: masterKey });
          if (window.api._setMasterKey) {
            window.api._setMasterKey(masterKey);
          }
          onSuccess();
        } else {
          triggerError(res.error || 'Senha incorreta');
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
    <div className="min-h-screen bg-[#0f0e17] flex items-center justify-center p-4">
      <div 
        className={`bg-dark-card border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl transition-all ${shake ? 'animate-shake' : ''}`}
      >
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
      </div>
    </div>
  );
}
