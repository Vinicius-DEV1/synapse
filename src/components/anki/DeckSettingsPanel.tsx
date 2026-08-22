import React, { useState, useEffect } from 'react';
import { triggerToast } from '../ui/ToastContext';

interface DeckSettingsPanelProps {
  deck: any;
  onSave: (name: string, desc: string, newLimit: number, reviewLimit: number, fsrsWeights: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onResetProgress: () => Promise<void>;
}

export default function DeckSettingsPanel({ deck, onSave, onDelete, onResetProgress }: DeckSettingsPanelProps) {
  const [deckName, setDeckName] = useState(deck.name);
  const [deckDesc, setDeckDesc] = useState(deck.description || '');
  const [newLimit, setNewLimit] = useState(20);
  const [reviewLimit, setReviewLimit] = useState(200);
  const [fsrsWeights, setFsrsWeights] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, [deck.id]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      if (window.api?.anki?.getDeckSettings) {
        const s = await window.api.anki.getDeckSettings(deck.id);
        if (s) {
          setNewLimit(s.new_limit || 20);
          setReviewLimit(s.review_limit || 200);
          setFsrsWeights(s.fsrs_weights || '');
        }
      }
    } catch (e: any) {
      console.error('Erro ao carregar configurações do baralho:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    onSave(deckName, deckDesc, newLimit, reviewLimit, fsrsWeights);
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (window.api?.anki?.importDeck) {
        const res = await window.api.anki.importDeck(payload);
        if (res.success && res.stats) {
          const { stats } = res;
          triggerToast(`Importação concluída: ${stats.decksCreated} decks criados, ${stats.cardsCreated} cartões criados.`, 'success', 5000);
          window.location.reload(); 
        } else if (res.success) {
          triggerToast('Baralho importado com sucesso!', 'success');
          window.location.reload(); 
        } else {
          triggerToast('Erro ao importar: ' + (res.error || 'Falha desconhecida'), 'error');
        }
      }
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || 'Erro ao ler ou processar arquivo de importação.', 'error');
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExport = async () => {
    if (window.api?.anki?.exportDeckRecursive) {
      try {
        const res = await window.api.anki.exportDeckRecursive(deck.id);
        if (res.success && res.payload) {
          const jsonString = JSON.stringify(res.payload, null, 2);
          const blob = new Blob([jsonString], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `baralho_${deck.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          triggerToast('Baralho exportado com sucesso!', 'success');
        } else {
          triggerToast(res.error || 'Erro ao exportar baralho', 'error');
        }
      } catch (err: any) {
        console.error(err);
        triggerToast(err.message || 'Erro ao exportar baralho', 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="absolute top-0 left-0 right-0 bg-dark-card p-8 border-b border-white/5 z-10 shadow-2xl flex justify-center text-dark-subtext">
        Carregando configurações...
      </div>
    );
  }

  return (
    <div className="absolute top-0 left-0 right-0 bg-dark-card p-8 border-b border-white/5 z-10 animate-fade-in shadow-2xl">
      <h3 className="text-lg font-medium mb-4 text-dark-text">Configurações do Baralho</h3>
      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-xs font-medium text-dark-subtext mb-1">Nome do Baralho</label>
          <input type="text" value={deckName} onChange={e => setDeckName(e.target.value)} className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2.5 text-sm text-dark-text focus:outline-none focus:border-indigo-500 transition-colors hover:border-white/20" />
        </div>
        <div>
          <label className="block text-xs font-medium text-dark-subtext mb-1">Descrição</label>
          <input type="text" value={deckDesc} onChange={e => setDeckDesc(e.target.value)} className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2.5 text-sm text-dark-text focus:outline-none focus:border-indigo-500 transition-colors hover:border-white/20" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-dark-subtext mb-1">Limite Diário (Novos)</label>
            <input type="number" min="0" value={newLimit} onChange={e => setNewLimit(Number(e.target.value))} className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-sm text-dark-text focus:outline-none focus:border-indigo-500 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-subtext mb-1">Limite Diário (Revisão)</label>
            <input type="number" min="0" value={reviewLimit} onChange={e => setReviewLimit(Number(e.target.value))} className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-sm text-dark-text focus:outline-none focus:border-indigo-500 transition-colors" />
          </div>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-dark-subtext mb-1">Pesos FSRS (Opcional - JSON Array)</label>
          <input type="text" placeholder="Ex: [0.4, 1.1, 3.1, ...]" value={fsrsWeights} onChange={e => setFsrsWeights(e.target.value)} className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2.5 text-sm text-dark-text font-mono focus:outline-none focus:border-indigo-500 transition-colors hover:border-white/20" />
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t border-white/10">
          <div className="flex flex-col gap-2">
            <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="text-green-400 hover:text-green-300 text-sm font-medium text-left transition-colors">Importar / Mesclar Baralho</button>
            <button onClick={handleExport} className="text-blue-400 hover:text-blue-300 text-sm font-medium text-left transition-colors">Exportar Baralho + Sub-baralhos</button>
            <button onClick={onResetProgress} className="text-orange-400 hover:text-orange-300 text-sm font-medium text-left transition-colors">Resetar Progresso (FSRS)</button>
            <button onClick={onDelete} className="text-red-400 hover:text-red-300 text-sm font-medium text-left transition-colors">Excluir Baralho Inteiro</button>
          </div>
          <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg">Salvar Alterações</button>
        </div>
      </div>
    </div>
  );
}
