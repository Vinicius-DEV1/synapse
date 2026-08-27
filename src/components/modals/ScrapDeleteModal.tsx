import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { deleteScrapSafely } from '../../services/scrap/scrap-storage';
import { triggerToast } from '../ui/ToastContext';

export interface ScrapDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: () => void;
  scrapData: {
    scrapId: string;
    url: string;
    title?: string | null;
    driveFileId?: string | null;
    isLastReference?: boolean;
  } | null;
}

export function ScrapDeleteModal({
  isOpen,
  onClose,
  onConfirmDelete,
  scrapData,
}: ScrapDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !scrapData) return null;

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      // 1. Se for a única/última referência ao snapshot, exclui do Drive e disco.
      // Se for uma duplicata copiada no texto, apenas remove o nó mantendo o arquivo fonte para o outro widget.
      if (scrapData.isLastReference !== false) {
        await deleteScrapSafely(scrapData.scrapId, scrapData.driveFileId);
      }

      // 2. Notifica editor para remover o nó do documento
      onConfirmDelete();
      triggerToast('Snapshot web excluído com sucesso.', 'success');
      onClose();
    } catch (err: any) {
      console.error('[ScrapDeleteModal] Erro ao excluir snapshot:', err);
      // Mesmo com erro parcial no drive, remove da nota para não travar o usuário
      onConfirmDelete();
      triggerToast('Snapshot removido da nota.', 'info');
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const modalJsx = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in w-screen h-screen">
      <div
        className="relative w-full max-w-md bg-dark-bg border border-rose-500/20 rounded-3xl shadow-2xl overflow-hidden animate-scale-up p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white leading-tight">
              Excluir Snapshot Web?
            </h3>
            <p className="text-xs text-dark-subtext truncate mt-0.5">
              {scrapData.title || scrapData.url}
            </p>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 mb-6">
          <p className="text-xs text-dark-subtext leading-relaxed">
            Esta ação removerá este bloco da sua nota e <strong className="text-rose-400">excluirá permanentemente</strong> o snapshot salvo com criptografia no seu <strong className="text-white">Google Drive</strong> e no cache local do dispositivo.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-medium text-dark-subtext hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 transition-all flex items-center gap-2 shadow-lg shadow-rose-600/20 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Excluindo com Segurança...
              </>
            ) : (
              <>
                <Trash2 size={14} />
                Excluir Definitivamente
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalJsx, document.body);
}
