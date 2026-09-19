/**
 * @file SharePasswordGate.tsx
 * @description Password challenge screen for password-protected shared pages.
 * Includes rate-limiting protection against brute-force guessing.
 */

import React, { useState } from 'react';
import { Lock, ArrowRight, AlertCircle, Shield } from 'lucide-react';

interface SharePasswordGateProps {
  pageTitle: string;
  pageIcon: string;
  onVerify: (password: string) => Promise<boolean>;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export const SharePasswordGate: React.FC<SharePasswordGateProps> = ({
  pageTitle,
  pageIcon,
  onVerify,
}) => {
  const [password, setPassword] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isSubmitting || isLocked) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const success = await onVerify(password);
      setIsSubmitting(false);

      if (!success) {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);

        if (nextAttempts >= MAX_ATTEMPTS) {
          const lockoutTime = Date.now() + LOCKOUT_MINUTES * 60 * 1000;
          setLockedUntil(lockoutTime);
          setError(`Muitas tentativas incorretas. Tente novamente em ${LOCKOUT_MINUTES} minutos.`);
        } else {
          setError(`Senha incorreta. Tentativa ${nextAttempts} de ${MAX_ATTEMPTS}.`);
        }
      }
    } catch (err) {
      console.error('Password verification error:', err);
      setIsSubmitting(false);
      setError('Erro de conexão ou ao descriptografar. Tente novamente.');
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100">
      <div className="w-full max-w-md bg-zinc-900/60 border border-white/[0.08] rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        {/* Header Icon */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="text-4xl mb-1">{pageIcon || '📄'}</div>
          <h1 className="text-xl font-bold text-white tracking-tight">{pageTitle}</h1>
          <p className="text-xs text-zinc-400 flex items-center gap-1.5">
            <Lock size={13} className="text-indigo-400" />
            <span>Esta página está protegida por senha</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <div className="relative">
              <input
                type="password"
                placeholder="Digite a senha de acesso..."
                value={password}
                disabled={isLocked || isSubmitting}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="w-full px-4 py-3.5 rounded-2xl bg-black/50 border border-white/10 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLocked || isSubmitting || !password.trim()}
                className="absolute right-2 top-2 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all cursor-pointer"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 text-center">
            <p className="text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
              <Shield size={12} className="text-zinc-600" />
              <span>Criptografia ponta-a-ponta com PBKDF2 (600.000 iterações)</span>
            </p>
          </div>
        </form>
      </div>
    </main>
  );
};
