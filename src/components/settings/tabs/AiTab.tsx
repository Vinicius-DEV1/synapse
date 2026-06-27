import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, DatabaseBackup } from 'lucide-react';
import type { AppSettings } from '../../../utils/settings';
import { fetchGeminiModels } from '../../../services/gemini';
import type { GeminiModel } from '../../../services/gemini';

interface AiTabProps {
  appSettings: AppSettings;
  setAppSettings: (settings: AppSettings) => void;
}

export default function AiTab({ appSettings, setAppSettings }: AiTabProps) {
  const [models, setModels] = useState<GeminiModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState('');

  const [dictDownloading, setDictDownloading] = useState(false);
  const [dictProgress, setDictProgress] = useState(0);

  useEffect(() => {
    if (appSettings.geminiApiKey && models.length === 0) {
      loadModels(appSettings.geminiApiKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appSettings.geminiApiKey]);

  const loadModels = async (key: string) => {
    if (!key) return;
    setLoadingModels(true);
    setModelsError('');
    try {
      const fetched = await fetchGeminiModels(key);
      setModels(fetched);
    } catch (err: any) {
      setModelsError(err.message || 'Erro ao carregar modelos');
    } finally {
      setLoadingModels(false);
    }
  };

  const handleDownloadDict = () => {
    setDictDownloading(true);
    setDictProgress(0);
    const interval = setInterval(() => {
      setDictProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setAppSettings({ ...appSettings, hasOfflineDictionary: true });
          setDictDownloading(false);
          return 100;
        }
        return p + 10;
      });
    }, 200);
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
          <Sparkles size={16} className="text-brand-400" />
          Gemini API Key
        </label>
        <input
          type="password"
          value={appSettings.geminiApiKey || ''}
          onChange={(e) => setAppSettings({ ...appSettings, geminiApiKey: e.target.value })}
          className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
          placeholder="Sua chave da API..."
        />
        <button 
          type="button"
          onClick={() => loadModels(appSettings.geminiApiKey!)}
          disabled={!appSettings.geminiApiKey || loadingModels}
          className="mt-2 text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw size={12} className={loadingModels ? 'animate-spin' : ''} />
          Carregar modelos disponíveis
        </button>
      </div>
      
      <div className="border-t border-white/5 pt-4">
        <label className="block text-sm font-medium text-white mb-2">Modelo Principal</label>
        <select 
          value={appSettings.geminiModel || 'gemini-1.5-pro'}
          onChange={(e) => setAppSettings({ ...appSettings, geminiModel: e.target.value })}
          className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
        >
          {models.length > 0 ? (
            models.map(m => (
              <option key={m.name} value={m.name}>{m.displayName} ({m.version})</option>
            ))
          ) : (
            <>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
            </>
          )}
        </select>
        {modelsError && <p className="text-xs text-red-400 mt-2">{modelsError}</p>}
      </div>
      
      <div className="border-t border-white/5 pt-4">
        <label className="block text-sm font-medium text-white mb-2">Destaque de Texto (Chat de IA)</label>
        <select 
          value={appSettings.aiChatHighlight || 'glow'}
          onChange={(e) => setAppSettings({ ...appSettings, aiChatHighlight: e.target.value as 'glow' | 'underline' | 'none' })}
          className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
        >
          <option value="glow">Brilho Pulsante (Recomendado)</option>
          <option value="underline">Apenas Sublinhado (Sutil)</option>
          <option value="none">Nenhum (Invisível)</option>
        </select>
        <p className="text-[11px] text-dark-subtext mt-1.5">
          Define como os trechos de texto que possuem um chat vinculado serão exibidos no editor.
        </p>
      </div>
      
      <div className="border-t border-white/5 pt-4">
        <label className="block text-sm font-medium text-white mb-2">Modo do Dicionário (PDF)</label>
        <select 
          value={appSettings.dictionaryMode || 'offline'}
          onChange={(e) => setAppSettings({ ...appSettings, dictionaryMode: e.target.value as 'offline' | 'online' })}
          className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
        >
          <option value="offline">Offline (Banco de Dados Local)</option>
          <option value="online">Online (IA Inteligente)</option>
        </select>
        <p className="text-[11px] text-dark-subtext mt-1.5 mb-3">
          Define qual motor o Dicionário de PDFs irá usar por padrão ao ser aberto.
        </p>

        <div className="bg-black/20 rounded-xl p-3 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DatabaseBackup size={14} className={appSettings.hasOfflineDictionary ? "text-emerald-400" : "text-dark-subtext"} />
              <span className="text-xs font-medium text-white">Pacote pt-BR (Offline)</span>
            </div>
            {appSettings.hasOfflineDictionary ? (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-medium">Instalado (12MB)</span>
            ) : (
              <span className="text-[10px] bg-white/10 text-dark-subtext px-2 py-0.5 rounded-full">Não instalado</span>
            )}
          </div>
          
          {!appSettings.hasOfflineDictionary && !dictDownloading && (
            <button 
              type="button"
              onClick={handleDownloadDict}
              className="w-full mt-2 py-1.5 bg-brand-500/20 hover:bg-brand-500/30 text-brand-400 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              Baixar Dicionário
            </button>
          )}
          
          {dictDownloading && (
            <div className="mt-3">
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 transition-all duration-200" style={{ width: `${dictProgress}%` }} />
              </div>
              <p className="text-[10px] text-dark-subtext text-center mt-1.5">Baixando... {dictProgress}%</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
