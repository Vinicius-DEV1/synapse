/**
 * @file AccountStatusSection.tsx
 * @description Settings section displaying current Firebase Auth identity,
 * multi-user account status, logout option, or trigger to evolve account.
 */

import React, { useState } from 'react';
import { Sparkles, User, LogOut, CheckCircle2, ShieldAlert } from 'lucide-react';
import { getCurrentAuthUser, signOutFromFirebase } from '../../../../services/auth/firebase-auth';

export const AccountStatusSection: React.FC = () => {
  const [user, setUser] = useState(() => getCurrentAuthUser());

  const handleLogout = async () => {
    try {
      await signOutFromFirebase();
      setUser(null);
      window.location.reload();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="bg-dark-card/50 border border-white/[0.06] rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
            <User size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Identidade da Conta</h3>
            <p className="text-xs text-zinc-400">
              {user ? 'Conta multiusuário conectada via Firebase' : 'Modo local (usuário único com senha mestre)'}
            </p>
          </div>
        </div>

        {user ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={12} />
            Conectado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <ShieldAlert size={12} />
            Modo Local
          </span>
        )}
      </div>

      {user ? (
        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
          <div className="min-w-0">
            <p className="text-zinc-300 font-medium truncate">{user.email}</p>
            <p className="text-zinc-500 text-[11px] font-mono truncate">UID: {user.uid}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/20 text-rose-300 hover:bg-rose-500/10 transition-colors shrink-0"
          >
            <LogOut size={13} />
            <span>Sair da Conta</span>
          </button>
        </div>
      ) : (
        <div className="pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-account-evolution'))}
            className="w-full py-2.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/25 text-xs font-medium text-brand-300 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles size={14} />
            <span>Evoluir para Conta Multiusuário (Workspaces Colaborativos)</span>
          </button>
        </div>
      )}
    </div>
  );
};
