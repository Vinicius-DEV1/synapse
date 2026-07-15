import React, { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, Key, RefreshCw, AlertTriangle, Play, CheckCircle2, AlertCircle } from 'lucide-react';
import type { VaultItem, BreachCheckResult } from '../../types_vault';

interface VaultSecurityDashboardProps {
  items: VaultItem[];
  onEditItem: (item: VaultItem) => void;
}

interface AnalyzedItem extends VaultItem {
  strengthScore?: number;
  breachedCount?: number;
  isReused?: boolean;
}

export function VaultSecurityDashboard({ items, onEditItem }: VaultSecurityDashboardProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analyzedItems, setAnalyzedItems] = useState<AnalyzedItem[]>([]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const startAnalysis = async () => {
    if (items.length === 0) return;
    setAnalyzing(true);
    setProgress(0);
    setHasAnalyzed(false);

    const results: AnalyzedItem[] = [...items];
    
    // Group passwords to find reused ones
    const passwordMap = new Map<string, string[]>(); // password -> itemIds
    items.forEach(item => {
      if (item.password && item.password.length > 0) {
        const existing = passwordMap.get(item.password) || [];
        existing.push(item.id);
        passwordMap.set(item.password, existing);
      }
    });

    const reusedIds = new Set<string>();
    passwordMap.forEach(ids => {
      if (ids.length > 1) {
        ids.forEach(id => reusedIds.add(id));
      }
    });

    // We only need to check breach once per unique password
    const uniquePasswords = Array.from(passwordMap.keys());
    const breachCache = new Map<string, number>();

    let totalChecks = items.length; // items to check strength + unique to check breach
    let completedChecks = 0;

    for (let i = 0; i < results.length; i++) {
      const item = results[i];
      if (!item.password) {
        completedChecks++;
        setProgress(Math.round((completedChecks / totalChecks) * 100));
        continue;
      }

      item.isReused = reusedIds.has(item.id);

      // Check strength
      try {
        item.strengthScore = await window.api.vault?.checkStrength(item.password);
      } catch {
        item.strengthScore = 0;
      }

      // Check breach (use cache to avoid duplicate network requests)
      if (breachCache.has(item.password)) {
        item.breachedCount = breachCache.get(item.password);
      } else {
        try {
          const breachRes = await window.api.vault?.checkBreach(item.password);
          item.breachedCount = breachRes?.count || 0;
          breachCache.set(item.password, item.breachedCount);
          // Wait 100ms to avoid spamming the backend/API
          await new Promise(r => setTimeout(r, 100));
        } catch {
          item.breachedCount = 0;
        }
      }

      completedChecks++;
      setProgress(Math.round((completedChecks / totalChecks) * 100));
      setAnalyzedItems([...results]); // force partial render
    }

    setAnalyzing(false);
    setHasAnalyzed(true);
  };

  const weakItems = analyzedItems.filter(i => i.strengthScore !== undefined && i.strengthScore < 3);
  const reusedItems = analyzedItems.filter(i => i.isReused);
  const breachedItems = analyzedItems.filter(i => i.breachedCount !== undefined && i.breachedCount > 0);

  // Calculate Health Score (0-100)
  let score = 100;
  if (items.length > 0) {
    const penaltyPerWeak = 5;
    const penaltyPerReused = 10;
    const penaltyPerBreached = 20;

    score -= (weakItems.length * penaltyPerWeak);
    score -= (reusedItems.length * penaltyPerReused);
    score -= (breachedItems.length * penaltyPerBreached);
    score = Math.max(0, score);
  } else {
    score = 0;
  }

  const getScoreColor = () => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 70) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="flex-1 flex flex-col bg-dark-bg overflow-y-auto p-8 animate-fade-in relative pb-32">
      <div className="max-w-4xl mx-auto w-full">
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-dark-text flex items-center gap-3">
              <ShieldCheck size={32} className="text-brand-400" />
              Painel de Segurança
            </h1>
            <p className="text-dark-subtext mt-1">Analise a integridade de todas as suas senhas do cofre.</p>
          </div>
          
          <button 
            onClick={startAnalysis}
            disabled={analyzing || items.length === 0}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors shadow-lg shadow-brand-500/20 flex items-center gap-2"
          >
            {analyzing ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
            {analyzing ? 'Analisando...' : hasAnalyzed ? 'Analisar Novamente' : 'Iniciar Análise'}
          </button>
        </div>

        {items.length === 0 && (
          <div className="bg-black/20 border border-white/5 rounded-2xl p-8 text-center text-dark-subtext">
            Você ainda não possui senhas no cofre para analisar.
          </div>
        )}

        {analyzing && (
          <div className="bg-dark-card/40 border border-brand-500/20 rounded-2xl p-8 text-center shadow-xl backdrop-blur-sm mb-8 animate-pulse">
            <ShieldCheck size={48} className="mx-auto text-brand-400 mb-4 animate-bounce" />
            <h2 className="text-xl font-semibold text-dark-text mb-2">Verificando {items.length} itens...</h2>
            <div className="w-full max-w-md mx-auto bg-black/30 rounded-full h-2.5 mb-2 overflow-hidden">
              <div className="bg-brand-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="text-sm text-dark-subtext">{progress}% concluído (checando força, repetição e vazamentos...)</p>
          </div>
        )}

        {hasAnalyzed && !analyzing && (
          <div className="space-y-8 animate-fade-in-up">
            
            {/* SCORE GERAL */}
            <div className="bg-dark-card/60 border border-white/5 rounded-3xl p-8 shadow-2xl flex items-center justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              
              <div className="z-10">
                <h2 className="text-lg font-semibold text-dark-subtext mb-1 uppercase tracking-widest">Saúde do Cofre</h2>
                <div className="flex items-end gap-2">
                  <span className={`text-6xl font-bold ${getScoreColor()}`}>{score}</span>
                  <span className="text-2xl text-dark-subtext mb-1">/100</span>
                </div>
                {score === 100 ? (
                  <p className="text-emerald-400 mt-2 flex items-center gap-1"><CheckCircle2 size={16} /> Excelente! Seu cofre está impenetrável.</p>
                ) : score >= 70 ? (
                  <p className="text-yellow-400 mt-2 flex items-center gap-1"><AlertCircle size={16} /> Muito bom, mas pode melhorar alguns detalhes.</p>
                ) : (
                  <p className="text-red-400 mt-2 flex items-center gap-1"><AlertTriangle size={16} /> Atenção! Você tem vulnerabilidades críticas.</p>
                )}
              </div>

              <div className="flex gap-4 z-10">
                <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl p-4 w-32 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-bold text-red-400 mb-1">{breachedItems.length}</span>
                  <span className="text-xs text-dark-subtext uppercase tracking-wider">Vazadas</span>
                </div>
                <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl p-4 w-32 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-bold text-orange-400 mb-1">{reusedItems.length}</span>
                  <span className="text-xs text-dark-subtext uppercase tracking-wider">Reutilizadas</span>
                </div>
                <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl p-4 w-32 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-bold text-yellow-400 mb-1">{weakItems.length}</span>
                  <span className="text-xs text-dark-subtext uppercase tracking-wider">Fracas</span>
                </div>
              </div>
            </div>

            {/* LISTAS DETALHADAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Senhas Vazadas */}
              <div className="bg-dark-card/40 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-red-500/10 text-red-400 rounded-lg"><AlertTriangle size={20} /></div>
                  <h3 className="text-lg font-semibold text-dark-text">Vazadas ({breachedItems.length})</h3>
                </div>
                <p className="text-xs text-dark-subtext mb-4">Senhas expostas na internet. Mude imediatamente.</p>
                
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {breachedItems.length === 0 ? (
                    <div className="text-emerald-400 text-sm py-4 text-center bg-emerald-500/5 rounded-xl border border-emerald-500/10">Nenhuma senha vazada!</div>
                  ) : breachedItems.map(item => (
                    <div key={item.id} onClick={() => onEditItem(item)} className="p-3 bg-black/20 hover:bg-black/40 border border-white/5 rounded-xl cursor-pointer transition-colors group">
                      <div className="font-medium text-sm text-dark-text group-hover:text-brand-400 transition-colors">{item.label}</div>
                      <div className="text-xs text-dark-subtext">{item.username || item.email}</div>
                      <div className="text-xs text-red-400 mt-1 font-semibold">{item.breachedCount?.toLocaleString()} vazamentos</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Senhas Reutilizadas */}
              <div className="bg-dark-card/40 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-orange-500/10 text-orange-400 rounded-lg"><RefreshCw size={20} /></div>
                  <h3 className="text-lg font-semibold text-dark-text">Reutilizadas ({reusedItems.length})</h3>
                </div>
                <p className="text-xs text-dark-subtext mb-4">Usar a mesma senha em vários sites é perigoso.</p>
                
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {reusedItems.length === 0 ? (
                    <div className="text-emerald-400 text-sm py-4 text-center bg-emerald-500/5 rounded-xl border border-emerald-500/10">Nenhuma senha repetida!</div>
                  ) : reusedItems.map(item => (
                    <div key={item.id} onClick={() => onEditItem(item)} className="p-3 bg-black/20 hover:bg-black/40 border border-white/5 rounded-xl cursor-pointer transition-colors group">
                      <div className="font-medium text-sm text-dark-text group-hover:text-brand-400 transition-colors">{item.label}</div>
                      <div className="text-xs text-dark-subtext">{item.username || item.email}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Senhas Fracas */}
              <div className="bg-dark-card/40 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-yellow-500/10 text-yellow-400 rounded-lg"><Key size={20} /></div>
                  <h3 className="text-lg font-semibold text-dark-text">Fracas ({weakItems.length})</h3>
                </div>
                <p className="text-xs text-dark-subtext mb-4">Fáceis de quebrar. Tente senhas mais longas.</p>
                
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {weakItems.length === 0 ? (
                    <div className="text-emerald-400 text-sm py-4 text-center bg-emerald-500/5 rounded-xl border border-emerald-500/10">Nenhuma senha fraca!</div>
                  ) : weakItems.map(item => (
                    <div key={item.id} onClick={() => onEditItem(item)} className="p-3 bg-black/20 hover:bg-black/40 border border-white/5 rounded-xl cursor-pointer transition-colors group">
                      <div className="font-medium text-sm text-dark-text group-hover:text-brand-400 transition-colors">{item.label}</div>
                      <div className="text-xs text-dark-subtext">{item.username || item.email}</div>
                      <div className="text-xs text-yellow-400 mt-1">Score: {item.strengthScore}/4</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
