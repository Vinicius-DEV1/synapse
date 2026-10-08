import React from 'react';
import {
  Layers,
  Eye,
  Sparkles,
  Image as ImageIcon,
  ShieldCheck,
  Lock,
  Share2,
} from 'lucide-react';

interface ShareCreationFormProps {
  scope: 'single' | 'with-children';
  setScope: (scope: 'single' | 'with-children') => void;
  permission: 'read-only' | 'editable';
  setPermission: (perm: 'read-only' | 'editable') => void;
  includeMedia: boolean;
  setIncludeMedia: (include: boolean) => void;
  requireOwnerApproval: boolean;
  setRequireOwnerApproval: (require: boolean) => void;
  isPasswordProtected: boolean;
  setIsPasswordProtected: (protectedStatus: boolean) => void;
  password: string;
  setPassword: (pwd: string) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export const ShareCreationForm: React.FC<ShareCreationFormProps> = ({
  scope,
  setScope,
  permission,
  setPermission,
  includeMedia,
  setIncludeMedia,
  requireOwnerApproval,
  setRequireOwnerApproval,
  isPasswordProtected,
  setIsPasswordProtected,
  password,
  setPassword,
  isSubmitting,
  onSubmit,
}) => {
  return (
    <div className="space-y-4">
      {/* Scope Selection */}
      <div>
        <label className="text-xs font-medium text-zinc-400 block mb-2">
          Escopo do Compartilhamento
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setScope('single')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              scope === 'single'
                ? 'bg-indigo-500/10 border-indigo-500/30 text-white'
                : 'bg-zinc-900/60 border-white/[0.04] text-zinc-400 hover:text-zinc-300'
            }`}
          >
            <span className="text-xs font-semibold block text-zinc-200">Apenas esta página</span>
            <span className="text-[11px] text-zinc-500">Compartilha isoladamente</span>
          </button>

          <button
            type="button"
            onClick={() => setScope('with-children')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              scope === 'with-children'
                ? 'bg-indigo-500/10 border-indigo-500/30 text-white'
                : 'bg-zinc-900/60 border-white/[0.04] text-zinc-400 hover:text-zinc-300'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Layers size={13} />
              <span className="text-xs font-semibold text-zinc-200">Com sub-páginas</span>
            </div>
            <span className="text-[11px] text-zinc-500">Inclui páginas filhas</span>
          </button>
        </div>
      </div>

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
                : 'bg-zinc-900/60 border-white/[0.04] text-zinc-400 hover:text-zinc-300'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Eye size={13} />
              <span className="text-xs font-semibold text-zinc-200">Apenas Leitura</span>
            </div>
            <span className="text-[11px] text-zinc-500">Visitantes só visualizam</span>
          </button>

          <button
            type="button"
            onClick={() => setPermission('editable')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              permission === 'editable'
                ? 'bg-indigo-500/10 border-indigo-500/30 text-white'
                : 'bg-zinc-900/60 border-white/[0.04] text-zinc-400 hover:text-zinc-300'
            }`}
          >
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Sparkles size={13} />
              <span className="text-xs font-semibold text-zinc-200">Edição com Cursores</span>
            </div>
            <span className="text-[11px] text-zinc-500">Colaboração ao vivo</span>
          </button>
        </div>
      </div>

      {/* Security Toggles */}
      <div className="space-y-2 pt-1">
        {/* Media toggle */}
        <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-white/[0.04] cursor-pointer hover:bg-zinc-900/80 transition-colors">
          <div className="flex items-center gap-2.5">
            <ImageIcon size={15} className="text-zinc-400" />
            <div>
              <span className="text-xs font-medium text-zinc-200 block">Incluir Mídias e Imagens</span>
              <span className="text-[11px] text-zinc-500">Empacota imagens criptografadas</span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={includeMedia}
            onChange={(e) => setIncludeMedia(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-500 focus:ring-indigo-400 border-zinc-700 bg-zinc-800"
          />
        </label>

        {/* Owner approval gate */}
        <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-white/[0.04] cursor-pointer hover:bg-zinc-900/80 transition-colors">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={15} className="text-emerald-400" />
            <div>
              <span className="text-xs font-medium text-zinc-200 block">Exigir Minha Autorização</span>
              <span className="text-[11px] text-zinc-500">
                O app avisa quando alguém tentar entrar
              </span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={requireOwnerApproval}
            onChange={(e) => setRequireOwnerApproval(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-500 focus:ring-indigo-400 border-zinc-700 bg-zinc-800"
          />
        </label>

        {/* Password Protection */}
        <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.04] space-y-2">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2.5">
              <Lock size={15} className="text-zinc-400" />
              <div>
                <span className="text-xs font-medium text-zinc-200 block">Proteger com Senha</span>
                <span className="text-[11px] text-zinc-500">Exige senha do visitante</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isPasswordProtected}
              onChange={(e) => setIsPasswordProtected(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-500 focus:ring-indigo-400 border-zinc-700 bg-zinc-800"
            />
          </label>

          {isPasswordProtected && (
            <input
              type="password"
              placeholder="Digite uma senha forte..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-2 px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-xs text-white placeholder-zinc-500 outline-none focus:border-indigo-500 transition-colors"
            />
          )}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={onSubmit}
        disabled={isSubmitting || (isPasswordProtected && !password.trim())}
        className="w-full py-3 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-2"
      >
        <Share2 size={15} />
        <span>{isSubmitting ? 'Gerando Link Criptografado...' : 'Gerar Link Seguro'}</span>
      </button>
    </div>
  );
};
