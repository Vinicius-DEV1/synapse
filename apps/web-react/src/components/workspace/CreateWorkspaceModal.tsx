/**
 * @file CreateWorkspaceModal.tsx
 * @description Modal dialog for provisioning a new collaborative workspace.
 */

import React, { useState } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';
import { createWorkspace } from '../../services/workspace/workspace-service';
import { getCurrentAuthUser } from '../../services/auth/firebase-auth';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterKey: CryptoKey | null;
  onWorkspaceCreated: (workspaceId: string) => void;
}

const EMOJI_OPTIONS = ['📁', '🚀', '💡', '📚', '⚡', '🏢', '🔬', '🎨', '🎯', '🛠️'];

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  isOpen,
  onClose,
  masterKey,
  onWorkspaceCreated,
}) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📁');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome do workspace é obrigatório.');
      return;
    }
    const user = getCurrentAuthUser();
    if (!user || !masterKey) {
      setError('Sessão criptográfica ou usuário não disponível.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await createWorkspace(
        user.uid,
        user.email || 'user@example.com',
        { name: name.trim(), icon, type: 'team' },
        masterKey
      );
      onWorkspaceCreated(res.workspace.id);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao criar workspace';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative animate-scale-up"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Fechar"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-2 text-zinc-100 font-semibold text-lg">
          <Sparkles size={20} className="text-amber-400" />
          <h2>Criar Novo Workspace</h2>
        </div>
        <p className="text-xs text-zinc-400 mb-5">
          Crie um espaço colaborativo independente com criptografia de ponta a ponta para sua equipe ou projeto.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Ícone</label>
            <div className="flex items-center gap-2 flex-wrap">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  type="button"
                  key={e}
                  onClick={() => setIcon(e)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-transform active:scale-95 ${
                    icon === e
                      ? 'bg-white/15 ring-2 ring-white/30 scale-105'
                      : 'hover:bg-white/5'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Nome do Workspace
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Engenharia de Software"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-zinc-100 text-sm focus:outline-none focus:border-brand-500 transition-colors"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-500 text-white hover:bg-brand-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-brand-500/20"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              <span>Criar Workspace</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
