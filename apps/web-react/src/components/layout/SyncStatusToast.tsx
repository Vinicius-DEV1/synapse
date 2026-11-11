import { CheckCircle2, XCircle, Cloud } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useSyncStatus, type SyncStatus } from '../../hooks/useSync';

interface SyncStatusToastProps {
  status?: SyncStatus;
}

export function SyncStatusToast({ status: propStatus }: SyncStatusToastProps = {}) {
  const hookStatus = useSyncStatus();
  const status = propStatus ?? hookStatus;
  const { t } = useI18n();

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
          ? t('common.saving')
          : status === 'success'
          ? t('common.saved')
          : status === 'error'
          ? (!navigator.onLine ? t('common.offline') : t('common.error'))
          : ''}
      </span>
    </div>
  );
}
