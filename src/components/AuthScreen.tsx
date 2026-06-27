import React, { useState } from 'react';
import { Lock, Unlock, ShieldAlert, KeyRound } from 'lucide-react';
import { useStore } from '../store/useStore';
import { deriveMasterKey } from '../services/crypto';

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
      let res;
      if (isSetup) {
        res = await window.api.auth.setup(password);
      } else {
        res = await window.api.auth.login(password);
      }

      if (res.success) {
        // Deriva a Master Key da senha inserida com sucesso (para uso no E2EE em memória)
        const masterKey = await deriveMasterKey(password);
        dispatch({ type: 'SET_MASTER_KEY', key: masterKey });
        
        // Injeta a chave na Web API Mock (se estiver rodando na Web)
        if (window.api._setMasterKey) {
          window.api._setMasterKey(masterKey);
        }
        
        onSuccess();
      } else {
        triggerError(res.error || 'Senha incorreta');
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
          <div className="w-16 h-16 bg-brand-500/20 rounded-full flex items-center justify-center text-brand-400">
            {isSetup ? <KeyRound size={32} /> : <Lock size={32} />}
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-white mb-2">
          {isSetup ? 'Criar Senha Mestra' : 'Caderno Protegido'}
        </h1>
        
        <p className="text-center text-dark-subtext mb-8 text-sm">
          {isSetup 
            ? 'Defina uma senha forte para criptografar todo o seu banco de dados. Atenção: Não existe opção de recuperação caso você a esqueça.' 
            : 'Seu banco de dados está criptografado. Digite a Senha Mestra para destrancá-lo.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-dark-subtext mb-1 ml-1 uppercase tracking-wider">
              Senha Mestra
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoFocus
              className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-white/20"
              placeholder="Digite sua senha secreta..."
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
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-pulse">Processando...</span>
            ) : (
              <>
                {isSetup ? <KeyRound size={18} /> : <Unlock size={18} />}
                {isSetup ? 'Criptografar e Salvar' : 'Destrancar'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
