import React, { useState } from 'react';
import { Key, Star, ExternalLink, Trash2, Eye, EyeOff, Check, Copy, History } from 'lucide-react';
import type { VaultItem } from '../../types';
import { VaultPasswordHistory } from './VaultPasswordHistory';
import { VaultBreachBadge } from './VaultBreachBadge';

interface VaultItemDetailsProps {
  item: VaultItem;
  onEdit: () => void;
  onDelete: () => void;
}

export function VaultItemDetails({ item, onEdit, onDelete }: VaultItemDetailsProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const parsedCustomFields = React.useMemo(() => {
    if (!item.custom_fields) return [];
    try {
      return JSON.parse(item.custom_fields);
    } catch {
      return [];
    }
  }, [item.custom_fields]);

  return (
    <div className="max-w-3xl mx-auto w-full p-8 animate-fade-in">
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500/20 to-brand-600/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
            <Key size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-dark-text flex items-center gap-2">
              {item.label}
              {item.is_favorite === 1 && <Star size={20} className="text-yellow-500" fill="currentColor" />}
            </h1>
            {item.url && (
              <a
                href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                target="_blank"
                rel="noreferrer"
                className="text-brand-400 hover:underline text-sm flex items-center gap-1 mt-1"
              >
                {item.url} <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors"
          >
            Editar
          </button>
          <button
            onClick={onDelete}
            className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Credenciais Base */}
        <div className="bg-dark-card/40 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-4">
          <h3 className="text-sm font-semibold text-dark-subtext uppercase tracking-wider mb-2">Credenciais</h3>

          {item.username && (
            <div className="group flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex flex-col">
                <span className="text-xs text-dark-subtext">Nome de Usuário</span>
                <span className="text-dark-text font-medium">{item.username}</span>
              </div>
              <button
                onClick={() => copyToClipboard(item.username!, 'username')}
                className="p-2 text-dark-subtext hover:text-white transition-colors"
              >
                {copiedField === 'username' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>
          )}

          {item.email && (
            <div className="group flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex flex-col">
                <span className="text-xs text-dark-subtext">E-mail</span>
                <span className="text-dark-text font-medium">{item.email}</span>
              </div>
              <button
                onClick={() => copyToClipboard(item.email!, 'email')}
                className="p-2 text-dark-subtext hover:text-white transition-colors"
              >
                {copiedField === 'email' ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>
          )}

          {item.password && (
            <div className="group flex items-center justify-between p-3 rounded-xl bg-brand-500/5 border border-brand-500/10 hover:bg-brand-500/10 transition-colors">
              <div className="flex flex-col flex-1">
                <span className="text-xs text-dark-subtext">Senha</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-dark-text font-mono text-lg tracking-wider">
                    {showPassword ? item.password : '••••••••••••'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-2 text-dark-subtext hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  onClick={() => copyToClipboard(item.password!, 'password')}
                  className="p-2 bg-brand-500 text-white rounded-lg hover:bg-brand-400 transition-colors shadow-lg shadow-brand-500/20"
                >
                  {copiedField === 'password' ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          )}

          {item.password && (
            <div className="mt-2">
              <VaultBreachBadge password={item.password} />
            </div>
          )}
        </div>

        {/* Campos Personalizados */}
        {parsedCustomFields.length > 0 && (
          <div className="bg-dark-card/40 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-sm space-y-4">
            <h3 className="text-sm font-semibold text-dark-subtext uppercase tracking-wider mb-2">Campos Adicionais</h3>
            <div className="grid grid-cols-2 gap-4">
              {parsedCustomFields.map((field: any, idx: number) => (
                <div key={idx} className="flex flex-col p-3 rounded-xl bg-white/5">
                  <span className="text-xs text-dark-subtext">{field.key}</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-dark-text truncate pr-2">
                      {field.type === 'hidden' && !showPassword ? '••••••••' : field.value}
                    </span>
                    <button
                      onClick={() => copyToClipboard(field.value, `custom-${idx}`)}
                      className="p-1 text-dark-subtext hover:text-white transition-colors"
                    >
                      {copiedField === `custom-${idx}` ? (
                        <Check size={14} className="text-green-400" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notas */}
        {item.notes && (
          <div className="bg-dark-card/40 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-dark-subtext uppercase tracking-wider mb-3">Anotações Seguras</h3>
            <div className="whitespace-pre-wrap text-sm text-dark-subtext/90 leading-relaxed font-mono bg-black/20 p-4 rounded-xl border border-white/5">
              {item.notes}
            </div>
          </div>
        )}

        {/* Histórico de Senhas */}
        <div className="bg-dark-card/40 border border-white/5 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
          <h3 className="text-sm font-semibold text-dark-subtext uppercase tracking-wider mb-4 flex items-center gap-2">
            <History size={16} /> Histórico de Senhas
          </h3>
          <VaultPasswordHistory itemId={item.id} />
        </div>
      </div>
    </div>
  );
}
