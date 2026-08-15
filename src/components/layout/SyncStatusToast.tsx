import React from 'react';
import { CheckCircle2, XCircle, Cloud } from 'lucide-react';

interface SyncStatusToastProps {
  status: 'idle' | 'syncing' | 'success' | 'error';
}

export function SyncStatusToast({ status }: SyncStatusToastProps) {
  return (
    <div
      className={`fixed bottom-4 right-6 flex items-center gap-1.5 pointer-events-none transition-opacity duration-1000 z-[9999]
        ${status === 'idle' ? 'opacity-0' : 'opacity-40'}
      `}
    >
      {status === 'syncing' && <Cloud size={12} className="text-dark-subtext animate-pulse" />}
      {status === 'success' && <CheckCircle2 size={12} className="text-emerald-400" />}
      {status === 'error' && <XCircle size={12} className="text-red-400" />}
      <span className="text-[10px] font-medium text-dark-subtext uppercase tracking-widest">
        {status === 'syncing'
          ? 'Salvando'
          : status === 'success'
          ? 'Salvo'
          : status === 'error'
          ? (!navigator.onLine ? 'Offline' : 'Erro')
          : ''}
      </span>
    </div>
  );
}
