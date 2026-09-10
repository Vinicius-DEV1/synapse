import { useState, useEffect, useRef } from 'react';
import { RefreshCw, DatabaseBackup, ShieldCheck } from 'lucide-react';
import type { AppSettings } from '../../../utils/settings';
import { fetchGeminiModels, getGeminiKeys, saveGeminiKeys } from '../../../services/gemini';
import type { GeminiModel, GeminiKeyEntry } from '../../../services/gemini';
import { ApiKeyPoolSection } from './ai/ApiKeyPoolSection';

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
  const [keys, setKeys] = useState<GeminiKeyEntry[]>([]);
  const [newKey, setNewKey] = useState('');
  const dictIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadKeys();
    return () => {
      if (dictIntervalRef.current) {
        clearInterval(dictIntervalRef.current);
        dictIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadKeys = async () => {
    try {
      const k = await getGeminiKeys();
      setKeys(k);
      if (k.some(key => key.status === 'active') && models.length === 0) {
        loadModels();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddKey = async () => {
    if (!newKey.trim()) return;
    try {
      const currentKeys = await getGeminiKeys();
      const newEntry: GeminiKeyEntry = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        key: newKey.trim(),
        status: 'active',
        addedAt: Date.now()
      };
      currentKeys.push(newEntry);
      await saveGeminiKeys(currentKeys);
      setKeys(currentKeys);
      setNewKey('');
      if (models.length === 0) loadModels();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveKey = async (id: string) => {
    try {
      let currentKeys = await getGeminiKeys();
      currentKeys = currentKeys.filter(k => k.id !== id);
      await saveGeminiKeys(currentKeys);
      setKeys(currentKeys);
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetKeys = async () => {
    const reset = keys.map(k => ({ ...k, status: 'active' as const, disabledUntil: undefined }));
    await saveGeminiKeys(reset);
    setKeys(reset);
  };

  const loadModels = async () => {
    setLoadingModels(true);
    setModelsError('');
    try {
      const fetched = await fetchGeminiModels();
      setModels(fetched);
    } catch (err: any) {
      setModelsError(err.message || 'Erro ao carregar modelos');
    } finally {
      setLoadingModels(false);
    }
  };

  const handleDownloadDict = () => {
    if (dictIntervalRef.current) {
      clearInterval(dictIntervalRef.current);
    }
    setDictDownloading(true);
    setDictProgress(0);
    dictIntervalRef.current = setInterval(() => {
      setDictProgress(p => {
        if (p >= 100) {
          if (dictIntervalRef.current) {
            clearInterval(dictIntervalRef.current);
            dictIntervalRef.current = null;
          }
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
        <ApiKeyPoolSection
          keys={keys}
          newKey={newKey}
          setNewKey={setNewKey}
          onAddKey={handleAddKey}
          onRemoveKey={handleRemoveKey}
          onResetKeys={handleResetKeys}
        />

        <button 
          type="button"
          onClick={() => loadModels()}
          disabled={keys.filter(k => k.status === 'active').length === 0 || loadingModels}
          className="mt-3 text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw size={12} className={loadingModels ? 'animate-spin' : ''} />
          Carregar modelos disponíveis
        </button>
      </div>
      
      <div className="border-t border-white/5 pt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">Modelo Padrão / Fallback</label>
          <select 
            value={appSettings.geminiModel ? (appSettings.geminiModel.startsWith('models/') ? appSettings.geminiModel : `models/${appSettings.geminiModel}`) : ''}
            onChange={(e) => setAppSettings({ ...appSettings, geminiModel: e.target.value })}
            className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
          >
            {models.length > 0 ? (
              models.map(m => (
                <option className="bg-dark-bg text-white" key={m.name} value={m.name}>{m.displayName} ({m.version})</option>
              ))
            ) : (
              <option className="bg-dark-bg text-white" value="">Clique em 'Carregar modelos disponíveis' acima</option>
            )}
          </select>
          <p className="text-[11px] text-dark-subtext mt-1.5">Usado se um módulo específico não tiver um modelo definido.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">Modelo para Chat e Assistente</label>
          <select 
            value={appSettings.geminiModelChat ? (appSettings.geminiModelChat.startsWith('models/') ? appSettings.geminiModelChat : `models/${appSettings.geminiModelChat}`) : ''}
            onChange={(e) => setAppSettings({ ...appSettings, geminiModelChat: e.target.value })}
            className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
          >
            <option className="bg-dark-bg text-white" value="">(Usar Modelo Padrão)</option>
            {models.map(m => (
              <option className="bg-dark-bg text-white" key={m.name} value={m.name}>{m.displayName} ({m.version})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">Modelo para Flashcards</label>
          <select 
            value={appSettings.geminiModelFlashcards ? (appSettings.geminiModelFlashcards.startsWith('models/') ? appSettings.geminiModelFlashcards : `models/${appSettings.geminiModelFlashcards}`) : ''}
            onChange={(e) => setAppSettings({ ...appSettings, geminiModelFlashcards: e.target.value })}
            className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
          >
            <option className="bg-dark-bg text-white" value="">(Usar Modelo Padrão)</option>
            {models.map(m => (
              <option className="bg-dark-bg text-white" key={m.name} value={m.name}>{m.displayName} ({m.version})</option>
            ))}
          </select>
          <p className="text-[11px] text-dark-subtext mt-1.5">Usado na geração, análise e avaliação de áudio nos flashcards.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">Modelo para Dicionário IA</label>
          <select 
            value={appSettings.geminiModelDictionary ? (appSettings.geminiModelDictionary.startsWith('models/') ? appSettings.geminiModelDictionary : `models/${appSettings.geminiModelDictionary}`) : ''}
            onChange={(e) => setAppSettings({ ...appSettings, geminiModelDictionary: e.target.value })}
            className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
          >
            <option className="bg-dark-bg text-white" value="">(Usar Modelo Padrão)</option>
            {models.map(m => (
              <option className="bg-dark-bg text-white" key={m.name} value={m.name}>{m.displayName} ({m.version})</option>
            ))}
          </select>
        </div>

        <div className="p-3.5 bg-purple-950/20 border border-purple-500/20 rounded-2xl space-y-3.5 mt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-purple-400" />
              <label className="text-sm font-semibold text-white">
                Validação Cruzada de Questões (Dupla IA)
              </label>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={appSettings.quizDualAiValidation !== false}
                onChange={(e) =>
                  setAppSettings({
                    ...appSettings,
                    quizDualAiValidation: e.target.checked,
                  })
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          <p className="text-[11px] text-dark-subtext leading-relaxed">
            Ao gerar questões no assistente, uma 2ª IA analisa a veracidade factual dos conceitos e a consistência do gabarito, eliminando alucinações antes da entrega.
          </p>

          {appSettings.quizDualAiValidation !== false && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-purple-500/10">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  IA 1: Geradora de Questões
                </label>
                <select
                  value={
                    appSettings.geminiModelQuizGenerator
                      ? appSettings.geminiModelQuizGenerator.startsWith('models/')
                        ? appSettings.geminiModelQuizGenerator
                        : `models/${appSettings.geminiModelQuizGenerator}`
                      : ''
                  }
                  onChange={(e) =>
                    setAppSettings({
                      ...appSettings,
                      geminiModelQuizGenerator: e.target.value,
                    })
                  }
                  className="w-full bg-dark-bg border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
                >
                  <option className="bg-dark-bg text-white" value="">
                    (Usar Modelo Chat / Padrão)
                  </option>
                  {models.map((m) => (
                    <option className="bg-dark-bg text-white" key={m.name} value={m.name}>
                      {m.displayName} ({m.version})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  IA 2: Revisora / Fact-Checker
                </label>
                <select
                  value={
                    appSettings.geminiModelQuizValidator
                      ? appSettings.geminiModelQuizValidator.startsWith('models/')
                        ? appSettings.geminiModelQuizValidator
                        : `models/${appSettings.geminiModelQuizValidator}`
                      : ''
                  }
                  onChange={(e) =>
                    setAppSettings({
                      ...appSettings,
                      geminiModelQuizValidator: e.target.value,
                    })
                  }
                  className="w-full bg-dark-bg border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
                >
                  <option className="bg-dark-bg text-white" value="">
                    (Usar Modelo Chat / Padrão)
                  </option>
                  {models.map((m) => (
                    <option className="bg-dark-bg text-white" key={m.name} value={m.name}>
                      {m.displayName} ({m.version})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
        
        {modelsError && <p className="text-xs text-red-400 mt-2">{modelsError}</p>}
      </div>
      
      <div className="border-t border-white/5 pt-4">
        <label className="block text-sm font-medium text-white mb-2">Destaque de Texto (Chat de IA)</label>
        <select 
          value={appSettings.aiChatHighlight || 'glow'}
          onChange={(e) => setAppSettings({ ...appSettings, aiChatHighlight: e.target.value as 'glow' | 'underline' | 'none' })}
          className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
        >
          <option className="bg-dark-bg text-white" value="glow">Brilho Pulsante (Recomendado)</option>
          <option className="bg-dark-bg text-white" value="underline">Apenas Sublinhado (Sutil)</option>
          <option className="bg-dark-bg text-white" value="none">Nenhum (Invisível)</option>
        </select>
        <p className="text-[11px] text-dark-subtext mt-1.5">
          Define como os trechos de texto que possuem um chat vinculado serão exibidos no editor.
        </p>
      </div>
      
      <div className="border-t border-white/5 pt-4">
        <label className="block text-sm font-medium text-white mb-2">Nível de Imersão (Dicionário IA)</label>
        <select 
          value={appSettings.aiDictionaryLanguage || 'bilingual'}
          onChange={(e) => setAppSettings({ ...appSettings, aiDictionaryLanguage: e.target.value as 'bilingual' | 'english_only' })}
          className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
        >
          <option className="bg-dark-bg text-white" value="bilingual">Bilíngue (Inglês + Português)</option>
          <option className="bg-dark-bg text-white" value="english_only">100% Inglês (Foco e Economia)</option>
        </select>
        <p className="text-[11px] text-dark-subtext mt-1.5">
          "Bilíngue" traz contexto extra em português. "100% Inglês" força a imersão e economiza sua cota de IA.
        </p>
      </div>

      <div className="border-t border-white/5 pt-4">
        <label className="block text-sm font-medium text-white mb-2">Modo do Dicionário (PDF)</label>
        <select 
          value={appSettings.dictionaryMode || 'offline'}
          onChange={(e) => setAppSettings({ ...appSettings, dictionaryMode: e.target.value as 'offline' | 'online' })}
          className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
        >
          <option className="bg-dark-bg text-white" value="offline">Offline (Banco de Dados Local)</option>
          <option className="bg-dark-bg text-white" value="online">Online (IA Inteligente)</option>
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
