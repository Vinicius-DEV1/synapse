import React from 'react';
import { Sparkles, Trash2, Plus, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
import type { GeminiKeyEntry } from '../../../../services/gemini';

interface ApiKeyPoolSectionProps {
  keys: GeminiKeyEntry[];
  newKey: string;
  setNewKey: (key: string) => void;
  onAddKey: () => void;
  onRemoveKey: (id: string) => void;
  onResetKeys?: () => void;
}

export function ApiKeyPoolSection({
  keys,
  newKey,
  setNewKey,
  onAddKey,
  onRemoveKey,
  onResetKeys,
}: ApiKeyPoolSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-white flex items-center gap-2">
          <Sparkles size={16} className="text-brand-400" />
          Pool de Chaves Gemini API
        </label>
        <span className="text-[10px] bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full font-medium">
          {keys.length} registrada(s)
        </span>
      </div>

      <p className="text-[11px] text-dark-subtext mb-3">
        Adicione múltiplas chaves. O sistema fará rodízio automático (failover) se uma cota for atingida.
      </p>

      <div className="space-y-2 mb-3 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
        {keys.map((k) => (
          <div
            key={k.id}
            className="flex items-center justify-between bg-black/20 border border-white/5 rounded-lg p-2.5"
          >
            <div className="flex items-center gap-3">
              <div className="text-[10px] font-mono text-dark-subtext bg-white/5 px-2 py-1 rounded">
                {k.key.slice(0, 8)}...{k.key.slice(-4)}
              </div>
              {k.status === 'active' ? (
                <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                  <CheckCircle2 size={12} /> Ativa
                </span>
              ) : (
                <span
                  className="flex items-center gap-1 text-[10px] font-medium text-red-400"
                  title={
                    k.disabledUntil
                      ? `Bloqueada até ${new Date(k.disabledUntil).toLocaleTimeString()}`
                      : ''
                  }
                >
                  <Clock size={12} /> Cota Esgotada (23h)
                </span>
              )}
            </div>
            <button
              onClick={() => onRemoveKey(k.id)}
              className="text-dark-subtext hover:text-red-400 transition-colors p-1"
              title="Remover chave"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {keys.length === 0 && (
          <div className="text-center py-4 text-xs text-dark-subtext border border-dashed border-white/10 rounded-lg">
            Nenhuma chave cadastrada.
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="password"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          className="flex-1 bg-dark-bg border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
          placeholder="Adicionar nova chave..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAddKey();
            }
          }}
        />
        <button
          type="button"
          onClick={onAddKey}
          disabled={!newKey.trim()}
          className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:hover:bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> Adicionar
        </button>
      </div>

      {keys.some((k) => k.status !== 'active') && onResetKeys && (
        <button
          type="button"
          onClick={onResetKeys}
          className="mt-2 text-[11px] text-brand-400 hover:text-brand-300 flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw size={12} /> Reativar todas as chaves agora
        </button>
      )}
    </div>
  );
}
