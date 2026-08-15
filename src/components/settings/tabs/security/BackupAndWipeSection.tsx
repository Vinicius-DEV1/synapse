import React from 'react';
import { DatabaseBackup, ShieldAlert } from 'lucide-react';

export function BackupAndWipeSection() {
  const handleExportBackup = async () => {
    try {
      if (window.api?.exportBackup) {
        const res = await window.api.exportBackup();
        if (res.success) {
          alert('Backup salvo com sucesso em: ' + res.path);
        } else if (!res.canceled) {
          alert('Erro ao salvar backup: ' + res.error);
        }
      }
    } catch (err: any) {
      alert('Erro inesperado: ' + err.message);
    }
  };

  const handleWipeLocalData = async () => {
    if (!confirm('ATENÇÃO: Deseja realmente apagar TODOS os dados locais (banco de dados e arquivos de mídia)?\n\nIsso NÃO apagará seus dados da nuvem. O aplicativo será reiniciado e fará o download de tudo novamente.')) return;
    try {
      if (window.api?.auth?.wipeLocalData) {
        await window.api.auth.wipeLocalData();
      }
    } catch (err: any) {
      alert('Erro ao limpar dados locais: ' + err.message);
    }
  };

  return (
    <>
      <div className="border-t border-white/5 pt-4">
        <button 
          type="button"
          onClick={handleExportBackup}
          className="w-full py-2.5 rounded-xl border border-white/10 text-sm font-medium text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
        >
          <DatabaseBackup size={16} />
          Exportar DB Local (Backup)
        </button>
        <p className="text-[11px] text-dark-subtext mt-1.5 text-center">
          Cria uma cópia física do banco de dados (também criptografada).
        </p>
      </div>

      <div className="border-t border-red-500/20 pt-4 mt-8">
        <button 
          type="button"
          onClick={handleWipeLocalData}
          className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-sm font-bold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
        >
          <ShieldAlert size={16} />
          APAGAR DADOS LOCAIS (FORÇAR SYNC)
        </button>
        <p className="text-[11px] text-red-400/70 mt-1.5 text-center">
          Deleta o banco local e mídias. O app reiniciará e baixará tudo da nuvem novamente.
        </p>
      </div>
    </>
  );
}
