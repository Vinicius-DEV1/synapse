import { useState, useEffect } from 'react';
import { History, Copy, Check } from 'lucide-react';
import type { VaultPasswordHistoryEntry } from '../../types';
import { triggerToast } from '../ui/ToastContext';

export function VaultPasswordHistory({ itemId }: { itemId: string }) {
  const [history, setHistory] = useState<VaultPasswordHistoryEntry[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  useEffect(() => {
    let isMounted = true;
    const loadHistory = async () => {
      try {
        const h = await window.api?.vault?.getPasswordHistory(itemId);
        if (isMounted && h) setHistory(h);
      } catch (e: unknown) {
        console.error('[Vault] Failed to load password history:', e);
      }
    };
    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [itemId]);

  const copyToClipboard = async (text: string, id: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err: unknown) {
      console.error('[Vault] Failed to copy old password:', err);
      triggerToast('Falha ao copiar senha antiga', 'error');
    }
  };

  if (history.length === 0) {
    return (
      <div className="text-sm text-dark-subtext flex flex-col items-center justify-center p-6 bg-black/10 rounded-xl border border-white/5">
        <History size={24} className="mb-2 opacity-50" />
        <p>Nenhuma senha antiga registrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {history.map(entry => (
        <div key={entry.id} className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
          <div className="flex flex-col">
            <span className="text-xs text-dark-subtext mb-1">
              Alterada em: {new Date(entry.changed_at).toLocaleString()}
            </span>
            <span className="text-sm font-mono text-dark-text tracking-wider">
              ••••••••••••
            </span>
          </div>
          <button 
            onClick={() => copyToClipboard(entry.password, entry.id)}
            className="p-2 text-dark-subtext hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Copiar senha antiga"
          >
            {copiedId === entry.id ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
          </button>
        </div>
      ))}
    </div>
  );
}
