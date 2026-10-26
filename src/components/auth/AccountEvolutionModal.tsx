/**
 * @file AccountEvolutionModal.tsx
 * @description Modal dialog allowing legacy single-user installations to evolve
 * into a full multi-user Firebase Authentication account with zero data loss.
 */

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  Lock,
  User,
  ArrowRight,
} from 'lucide-react';
import {
  registerWithFirebase,
  signInWithFirebase,
} from '../../services/auth/firebase-auth';
import { migrateLegacyUserToWorkspace } from '../../services/migration/legacy-migrator';
import { useStore } from '../../store/useStore';

interface AccountEvolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterKey: CryptoKey | null;
}

export const AccountEvolutionModal: React.FC<AccountEvolutionModalProps> = ({
  isOpen,
  onClose,
  masterKey,
}) => {
  const { dispatch } = useStore();
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Por favor preencha email e senha.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (!masterKey) {
      setError('Chave mestra não encontrada. Desbloqueie o aplicativo primeiro.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'register') {
        setStep('Criando sua identidade no Firebase Auth...');
        const user = await registerWithFirebase(email, password, displayName.trim() || undefined);

        setStep('Migrando seus dados para o seu novo Workspace Pessoal...');
        const res = await migrateLegacyUserToWorkspace(user.uid, user.email || email, masterKey);

        if (res.errors.length > 0) {
          throw new Error(res.errors[0]);
        }

        dispatch({
          type: 'SET_ACTIVE_WORKSPACE',
          workspaceId: res.workspaceId,
          role: 'owner',
        });

        setSuccess(true);
        setStep('Conta evoluída com sucesso!');
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setStep('Autenticando...');
        const user = await signInWithFirebase(email, password);

        setStep('Vinculando workspace pessoal...');
        const res = await migrateLegacyUserToWorkspace(user.uid, user.email || email, masterKey);

        if (res.errors.length === 0) {
          dispatch({
            type: 'SET_ACTIVE_WORKSPACE',
            workspaceId: res.workspaceId,
            role: 'owner',
          });
        }

        setSuccess(true);
        setStep('Login realizado e workspace sincronizado!');
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na evolução da conta.';
      setError(msg);
      setStep(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-dark-card border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">
              Evoluir para Multiusuário
            </h2>
            <p className="text-xs text-zinc-400">
              Vincule sua instalação a uma conta própria com workspaces colaborativos.
            </p>
          </div>
        </div>

        {/* Benefits notice */}
        <div className="mb-5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-zinc-300 space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            <ShieldCheck size={14} />
            <span>Migração segura e sem perda de dados</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Todas as suas notas, páginas, livros e configurações atuais serão
            copiados intactos para o seu Workspace Pessoal. Seus dados existentes
            nunca serão excluídos.
          </p>
        </div>

        {/* Tab selector */}
        <div className="flex rounded-xl bg-zinc-900/60 p-1 mb-4 border border-white/5">
          <button
            type="button"
            onClick={() => setMode('register')}
            disabled={isSubmitting}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-brand-500 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Criar Nova Conta
          </button>
          <button
            type="button"
            onClick={() => setMode('login')}
            disabled={isSubmitting}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-brand-500 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Entrar com Existente
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1 ml-1 uppercase tracking-wider">
                Nome de exibição (opcional)
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-3 text-zinc-500" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={isSubmitting || success}
                  className="w-full bg-dark-bg border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50"
                  placeholder="Seu nome"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1 ml-1 uppercase tracking-wider">
              Email
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-3 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting || success}
                className="w-full bg-dark-bg border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50"
                placeholder="seu.email@exemplo.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1 ml-1 uppercase tracking-wider">
              Senha da Conta
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-3 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting || success}
                className="w-full bg-dark-bg border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>

          {step && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-brand-500/10 border border-brand-500/20 text-xs text-brand-300">
              {success ? (
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
              ) : (
                <Loader2 size={14} className="animate-spin text-brand-400 shrink-0" />
              )}
              <span>{step}</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              <AlertCircle size={14} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-xl transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || success}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-medium px-5 py-2 rounded-xl transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Processando...</span>
                </>
              ) : success ? (
                <>
                  <CheckCircle2 size={14} />
                  <span>Concluído!</span>
                </>
              ) : (
                <>
                  <span>{mode === 'register' ? 'Criar & Migrar' : 'Entrar & Vincular'}</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
