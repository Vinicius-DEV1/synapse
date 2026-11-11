import { useState } from 'react';
import { DatabaseBackup, ShieldAlert } from 'lucide-react';
import { triggerToast } from '../../../ui/ToastContext';
import { ConfirmDialog } from '../../../ui/ConfirmDialog';
import { useI18n } from '../../../../i18n';

export function BackupAndWipeSection() {
  const { t } = useI18n();
  const [showConfirmWipe, setShowConfirmWipe] = useState(false);
  const [isWiping, setIsWiping] = useState(false);

  const handleExportBackup = async () => {
    try {
      if (window.api?.exportBackup) {
        const res = await window.api.exportBackup();
        if (res.success) {
          triggerToast(t('settings.security.backupSavedSuccess') || 'Backup salvo com sucesso em: ' + res.path, 'success', 6000);
        } else if (!res.canceled) {
          triggerToast((t('settings.security.backupSavedError') || 'Erro ao salvar backup: ') + (res.error || 'Falha'), 'error');
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Falha desconhecida';
      triggerToast((t('common.unexpectedError') || 'Erro inesperado: ') + errorMsg, 'error');
    }
  };

  const executeWipe = async () => {
    setIsWiping(true);
    try {
      if (window.api?.auth?.wipeLocalData) {
        await window.api.auth.wipeLocalData();
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Falha ao limpar dados';
      triggerToast((t('settings.security.wipeError') || 'Erro ao limpar dados locais: ') + errorMsg, 'error');
    } finally {
      setIsWiping(false);
      setShowConfirmWipe(false);
    }
  };

  const handleWipeLocalData = async () => {
    const msg = t('settings.security.wipeConfirmMessage') || 'ATENÇÃO: Deseja realmente apagar TODOS os dados locais (banco de dados e arquivos de mídia)?\n\nIsso NÃO apagará seus dados da nuvem. O aplicativo será reiniciado e fará o download de tudo novamente.';
    if (window.api?.app?.showConfirm) {
      const confirmed = (await window.api.app.showConfirm({
        title: t('settings.security.wipeConfirmTitle') || 'Apagar Dados Locais',
        message: msg,
        kind: 'warning',
      })) === 1;
      if (confirmed) {
        await executeWipe();
      }
    } else {
      setShowConfirmWipe(true);
    }
  };

  return (
    <>
      <div className="border-t border-white/5 pt-4">
        <button 
          type="button"
          onClick={handleExportBackup}
          className="w-full py-2.5 rounded-xl border border-white/[0.08] text-sm font-medium text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <DatabaseBackup size={16} />
          {t('settings.security.exportBackup') || 'Exportar DB Local (Backup)'}
        </button>
        <p className="text-[11px] text-dark-subtext mt-1.5 text-center">
          {t('settings.security.exportBackupDesc') || 'Cria uma cópia física do banco de dados (também criptografada).'}
        </p>
      </div>

      <div className="border-t border-red-500/20 pt-4 mt-8">
        <button 
          type="button"
          onClick={handleWipeLocalData}
          disabled={isWiping}
          className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-sm font-bold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.1)] cursor-pointer disabled:opacity-50"
        >
          <ShieldAlert size={16} />
          {isWiping ? (t('common.processing') || 'Processando...') : (t('settings.security.wipeLocalData') || 'APAGAR DADOS LOCAIS (FORÇAR SYNC)')}
        </button>
        <p className="text-[11px] text-red-400/70 mt-1.5 text-center">
          {t('settings.security.wipeLocalDataDesc') || 'Deleta o banco local e mídias. O app reiniciará e baixará tudo da nuvem novamente.'}
        </p>
      </div>

      <ConfirmDialog
        isOpen={showConfirmWipe}
        title={t('settings.security.wipeConfirmTitle') || 'Apagar Dados Locais'}
        message={t('settings.security.wipeConfirmMessage') || 'ATENÇÃO: Deseja realmente apagar TODOS os dados locais (banco de dados e arquivos de mídia)? Isso NÃO apagará seus dados da nuvem. O aplicativo será reiniciado e fará o download de tudo novamente.'}
        confirmText={t('common.confirm') || 'Sim, Apagar'}
        variant="danger"
        isLoading={isWiping}
        onConfirm={executeWipe}
        onCancel={() => setShowConfirmWipe(false)}
      />
    </>
  );
}

