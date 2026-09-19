/**
 * @file ShareExpiredScreen.tsx
 * @description Informs the visitor that the link is inactive, revoked, or expired.
 */

import React from 'react';
import { Clock, ShieldAlert } from 'lucide-react';

interface ShareExpiredScreenProps {
  reason?: 'revoked' | 'expired' | 'not-found';
}

export const ShareExpiredScreen: React.FC<ShareExpiredScreenProps> = ({
  reason = 'not-found',
}) => {
  const titles = {
    revoked: 'Compartilhamento Revogado',
    expired: 'Link Expirado',
    'not-found': 'Página Não Encontrada',
  };

  const descriptions = {
    revoked: 'Este link de compartilhamento foi desativado pelo proprietário da página.',
    expired: 'O prazo de validade deste link expirou.',
    'not-found': 'O link informado não existe ou não está mais acessível.',
  };

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100">
      <div className="w-full max-w-md bg-zinc-900/60 border border-white/[0.08] rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-white/5 flex items-center justify-center text-zinc-400 mx-auto">
          {reason === 'expired' ? <Clock size={30} /> : <ShieldAlert size={30} />}
        </div>

        <div className="space-y-2">
          <h1 className="text-lg font-bold text-white tracking-tight">{titles[reason]}</h1>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
            {descriptions[reason]}
          </p>
        </div>
      </div>
    </main>
  );
};
