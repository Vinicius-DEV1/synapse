/**
 * @file ShareConfigEditor.tsx
 * @description Modal for editing settings of an already active or paused share link,
 * including updating passwords, changing collaboration tiers, and toggling gates.
 */

import React, { useState } from 'react';
import { Settings, Lock, Eye, Sparkles, ShieldCheck, X, Check } from 'lucide-react';
import type { SharedPageConfig } from '../../types/sharing';
import { updateShareConfig } from '../../services/sharing/share-manager';
import { triggerToast } from '../ui/ToastContext';

interface ShareConfigEditorProps {
  share: SharedPageConfig;
  onClose: () => void;
  onUpdated: (updated: SharedPageConfig) => void;
}

export const ShareConfigEditor: React.FC<ShareConfigEditorProps> = ({
  share,
  onClose,
  onUpdated,
}) => {
  const [permission, setPermission] = useState(share.permission);
  const [requireOwnerApproval, setRequireOwnerApproval] = useState(
    share.requireOwnerApproval
  );
  const [changePassword, setChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      await updateShareConfig({
        shareId: share.id,
        permission,
        requireOwnerApproval,
        password: changePassword ? newPassword : undefined,
      });

      const updatedShare: SharedPageConfig = {
        ...share,
        permission,
        requireOwnerApproval,
        isPasswordProtected: changePassword ? Boolean(newPassword.trim()) : share.isPasswordProtected,
        updatedAt: new Date().toISOString(),
      };

      onUpdated(updatedShare);
      triggerToast('Configurações do compartilhamento atualizadas!', 'success');
      onClose();
    } catch (err) {
      console.error('Failed to update share config:', err);
      triggerToast('Erro ao atualizar configurações.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-300">
              <Settings size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Editar Compartilhamento</h3>
              <p className="text-xs text-zinc-400 truncate max-w-xs">{share.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {/* Permission Tier */}
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-2">
              Permissão do Visitante
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPermission('read-only')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  permission === 'read-only'
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-white'
                    : 'bg-zinc-900/60 border-white/[0.04] text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Eye size={13} />
                  <span className="text-xs font-semibold text-zinc-200">Apenas Leitura</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPermission('editable')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  permission === 'editable'
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-white'
                    : 'bg-zinc-900/60 border-white/[0.04] text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Sparkles size={13} />
                  <span className="text-xs font-semibold text-zinc-200">Edição com Cursores</span>
                </div>
              </button>
            </div>
          </div>

          {/* Owner Approval Gate */}
          <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-white/[0.04] cursor-pointer hover:bg-zinc-900/80 transition-colors">
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={15} className="text-emerald-400" />
              <div>
                <span className="text-xs font-medium text-zinc-200 block">Exigir Minha Autorização</span>
                <span className="text-[11px] text-zinc-500">Avisar antes de liberar novos dispositivos</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={requireOwnerApproval}
              onChange={(e) => setRequireOwnerApproval(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-500 focus:ring-indigo-400 border-zinc-700 bg-zinc-800"
            />
          </label>

          {/* Change Password */}
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.04] space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2.5">
                <Lock size={15} className="text-zinc-400" />
                <div>
                  <span className="text-xs font-medium text-zinc-200 block">Alterar ou Remover Senha</span>
                  <span className="text-[11px] text-zinc-500">
                    {share.isPasswordProtected ? 'Atualmente protegida por senha' : 'Sem senha no momento'}
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={changePassword}
                onChange={(e) => setChangePassword(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-500 focus:ring-indigo-400 border-zinc-700 bg-zinc-800"
              />
            </label>

            {changePassword && (
              <input
                type="password"
                placeholder="Nova senha (deixe em branco para remover)..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full mt-2 px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-xs text-white placeholder-zinc-500 outline-none focus:border-indigo-500 transition-colors"
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-900/60 border-t border-white/[0.06] flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Check size={14} />
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
};
