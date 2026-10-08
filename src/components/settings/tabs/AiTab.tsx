import { useState, useEffect, useRef } from 'react';
import { RefreshCw, DatabaseBackup, ShieldCheck, Sparkles, Filter, Check, X, Plus, Ban } from 'lucide-react';
import type { AppSettings } from '../../../utils/settings';
import type { CultureType } from '../../../types/culture';
import { fetchGeminiModels, getGeminiKeys, saveGeminiKeys } from '../../../services/gemini';
import type { GeminiModel, GeminiKeyEntry } from '../../../services/gemini';
import { ApiKeyPoolSection } from './ai/ApiKeyPoolSection';

const ALL_CULTURE_FORMATS: Array<{ type: CultureType; label: string; icon: string }> = [
  { type: 'filme', label: 'Filmes', icon: '🎬' },
  { type: 'série', label: 'Séries', icon: '📺' },
  { type: 'anime', label: 'Animes', icon: '⛩️' },
  { type: 'manga', label: 'Mangás', icon: '📖' },
  { type: 'livro', label: 'Livros', icon: '📚' },
  { type: 'hq', label: 'HQs & Comics', icon: '💬' },
  { type: 'novel', label: 'Novels', icon: '📝' },
];

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
  const [newThemeInput, setNewThemeInput] = useState('');
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

  const toggleFormat = (formatType: CultureType) => {
    const currentExcluded = appSettings.cultureExcludedTypes || [];
    const isCurrentlyExcluded = currentExcluded.includes(formatType);

    if (isCurrentlyExcluded) {
      setAppSettings({
        ...appSettings,
        cultureExcludedTypes: currentExcluded.filter(t => t !== formatType),
      });
    } else {
      if (currentExcluded.length >= ALL_CULTURE_FORMATS.length - 1) {
        return; // At least one format must remain active
      }
      setAppSettings({
        ...appSettings,
        cultureExcludedTypes: [...currentExcluded, formatType],
      });
    }
  };

  const handleAddExcludedTheme = () => {
    const trimmed = newThemeInput.trim().toLowerCase();
    if (!trimmed) return;
    const currentThemes = appSettings.cultureExcludedThemes || [];
    if (!currentThemes.includes(trimmed)) {
      setAppSettings({
        ...appSettings,
        cultureExcludedThemes: [...currentThemes, trimmed],
      });
    }
    setNewThemeInput('');
  };

  const handleRemoveExcludedTheme = (themeToRemove: string) => {
    const currentThemes = appSettings.cultureExcludedThemes || [];
    setAppSettings({
      ...appSettings,
      cultureExcludedThemes: currentThemes.filter(t => t !== themeToRemove),
    });
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

        {/* Recomendações Culturais */}
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-4 mt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              <label className="text-sm font-semibold text-white">
                Recomendações Culturais (Curadoria IA)
              </label>
            </div>
            <span className="text-[11px] text-amber-300/80 font-medium px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">
              Personalização Ativa
            </span>
          </div>

          {/* Volume de Recomendações */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">
              Densidade e Volume das Coleções
            </label>
            <select
              value={appSettings.cultureRecommendationsVolume || 'quadruple'}
              onChange={(e) =>
                setAppSettings({
                  ...appSettings,
                  cultureRecommendationsVolume: e.target.value as 'standard' | 'expanded' | 'quadruple',
                })
              }
              className="w-full bg-dark-bg border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
            >
              <option className="bg-dark-bg text-white" value="quadruple">
                Volume Máximo Dobrado (4 a 5 coleções com 28 a 36 obras cada — 120 a 160+ sugestões) — Recomendado
              </option>
              <option className="bg-dark-bg text-white" value="expanded">
                Volume Expandido (4 a 5 coleções com 20 a 24 obras cada — 80 a 100+ sugestões)
              </option>
              <option className="bg-dark-bg text-white" value="standard">
                Volume Moderado (3 a 4 coleções com 14 a 18 obras cada — 45 a 65 sugestões)
              </option>
            </select>
            <p className="text-[11px] text-dark-subtext leading-relaxed">
              Dobra a quantidade de obras recomendadas (28 a 36 obras por coleção, formando 5 a 6 fileiras completas de cards) mantendo estritamente entre 4 e 5 coleções temáticas sem poluí-las.
            </p>
          </div>

          {/* Formatos Permitidos / Excluídos */}
          <div className="space-y-2 pt-2 border-t border-amber-500/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Filter size={13} className="text-amber-400" />
                <span>Formatos Permitidos nas Recomendações</span>
              </label>
              <span className="text-[10px] text-zinc-400">
                {ALL_CULTURE_FORMATS.length - (appSettings.cultureExcludedTypes || []).length} de {ALL_CULTURE_FORMATS.length} ativos
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {ALL_CULTURE_FORMATS.map((f) => {
                const isExcluded = (appSettings.cultureExcludedTypes || []).includes(f.type);
                return (
                  <button
                    key={f.type}
                    type="button"
                    onClick={() => toggleFormat(f.type)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all border text-left ${
                      !isExcluded
                        ? 'bg-amber-500/15 border-amber-500/35 text-amber-200 shadow-sm'
                        : 'bg-white/[0.03] border-white/5 text-zinc-500 hover:text-zinc-400 hover:bg-white/[0.05]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm">{f.icon}</span>
                      <span className={isExcluded ? 'line-through text-zinc-500' : ''}>{f.label}</span>
                    </span>
                    {!isExcluded ? (
                      <Check size={13} className="text-amber-400 shrink-0 ml-1.5" />
                    ) : (
                      <X size={13} className="text-zinc-600 shrink-0 ml-1.5" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-dark-subtext leading-relaxed">
              Desative os formatos que não deseja receber (ex: Livros ou Animes). O algoritmo redistribuirá o espaço automaticamente para completar as coleções com os demais formatos permitidos (Filmes, Séries, etc.), mantendo as listas cheias e densas.
            </p>
          </div>

          {/* Temas / Gêneros a Excluir */}
          <div className="space-y-2 pt-2 border-t border-amber-500/10">
            <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
              <Ban size={13} className="text-amber-400" />
              <span>Temas, Tropos ou Gêneros a Excluir (Opcional)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newThemeInput}
                onChange={(e) => setNewThemeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddExcludedTheme();
                  }
                }}
                placeholder="Ex: terror, reality show, gore, faroeste..."
                className="flex-1 bg-dark-bg border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <button
                type="button"
                onClick={handleAddExcludedTheme}
                disabled={!newThemeInput.trim()}
                className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 disabled:opacity-40 disabled:hover:bg-amber-500/20 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border border-amber-500/30 cursor-pointer"
              >
                <Plus size={14} />
                <span>Adicionar</span>
              </button>
            </div>

            {(appSettings.cultureExcludedThemes || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(appSettings.cultureExcludedThemes || []).map((theme) => (
                  <span
                    key={theme}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs"
                  >
                    <span>{theme}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExcludedTheme(theme)}
                      className="hover:text-white transition-colors cursor-pointer"
                      title="Remover filtro"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-[11px] text-dark-subtext leading-relaxed">
              Tópicos ou gêneros que a IA deve evitar estritamente ao formular as recomendações.
            </p>
          </div>
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
