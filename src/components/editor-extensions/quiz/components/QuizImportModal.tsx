import { useState, useRef, useCallback } from 'react';
import {
  X,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  FileText,
  Sparkles,
  Copy,
  Check,
  FileCode,
  Loader2,
  Upload,
} from 'lucide-react';
import { Portal } from '../../../ui/Portal';
import { triggerToast } from '../../../ui/ToastContext';
import {
  sanitizeExpectedAnswer,
  promptGeminiToParseDocumentToQuizJSON,
  promptGeminiToRefineImportedQuestions,
  getCadernoQuizJsonSchemaPrompt,
} from '../../../../services/gemini';
import { extractTextFromPdf } from '../../../../utils/pdf-text-extractor';
import { QuizImportPreviewCard } from './import/QuizImportPreviewCard';
import type { QuestionItem } from '../types';

interface QuizImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (questions: QuestionItem[], mode: 'replace' | 'append') => void;
  currentBatteryQuestions?: QuestionItem[];
}

export default function QuizImportModal({
  isOpen,
  onClose,
  onImport,
  currentBatteryQuestions = [],
}: QuizImportModalProps) {
  const [importJsonText, setImportJsonText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<QuestionItem[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('append');
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Refinement state
  const [refinePrompt, setRefinePrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDeleteSingleQuestion = useCallback((indexToDelete: number) => {
    setImportPreview((prev) => {
      if (!prev) return null;
      return prev.filter((_, idx) => idx !== indexToDelete);
    });
    triggerToast('Questão removida do preview.', 'info', 2000);
  }, []);

  const mapParsedToQuestionItems = (items: Array<Record<string, unknown>>): QuestionItem[] => {
    return items.map((item, idx): QuestionItem => {
      const rawType = String(item.type || item.tipo || '').toLowerCase();
      const isOpenQuestion =
        rawType.includes('open') ||
        rawType.includes('aberta') ||
        rawType.includes('discursiva') ||
        rawType.includes('dissertativa');

      let options: string[] = [];
      const rawOpts =
        item.options || item.alternativas || item.opcoes || item.alternatives || [];
      if (Array.isArray(rawOpts) && rawOpts.length >= 2) {
        options = rawOpts.map((o: unknown) => {
          const str = typeof o === 'string' ? o : String(o);
          return str.replace(/^[A-Za-z0-9][).]\s+/, '').trim();
        });
      }
      if (!isOpenQuestion && options.length < 2) options = ['', '', '', ''];

      let correctIndex = 0;
      const rawCorrect =
        item.correct_option ??
        item.resposta_correta ??
        item.correctIndex ??
        item.correta;
      if (typeof rawCorrect === 'number') {
        correctIndex = rawCorrect;
      } else if (typeof rawCorrect === 'string') {
        const letter = rawCorrect.trim().toUpperCase().charCodeAt(0);
        if (letter >= 65 && letter <= 90) {
          correctIndex = letter - 65;
        }
      }

      const rawTags = item.tags || item.topicos;
      const tags = Array.isArray(rawTags)
        ? rawTags.map((t) => String(t).trim()).filter(Boolean)
        : [];

      return {
        id: `q_import_${Date.now()}_${idx}`,
        type: isOpenQuestion ? 'open' : 'multiple_choice',
        question: String(item.question || item.enunciado || item.pergunta || item.texto || '').trim(),
        options: options.length >= 2 ? options : ['', '', '', ''],
        correctIndex,
        tags,
        selectedIndex: null,
        expectedAnswer: sanitizeExpectedAnswer(
          String(item.expected_answer || item.resposta_esperada || item.gabarito || item.expectedAnswer || '')
        ),
        userTypedAnswer: '',
        aiFeedback: null,
        explanation: String(
          item.explanation || item.explicacao || item.justificativa || item.comentario || ''
        ).trim(),
        showExplanation: false,
        answered: false,
      };
    });
  };

  const parseJsonToQuestions = (raw: string): QuestionItem[] => {
    const json = JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim());

    const items: Array<Record<string, unknown>> | null = Array.isArray(json)
      ? json
      : Array.isArray(json.questions)
        ? json.questions
        : Array.isArray(json.questoes)
          ? json.questoes
          : Array.isArray(json.items)
            ? json.items
            : null;

    if (!items) {
      throw new Error(
        'Não encontrei uma lista de questões no JSON. Verifique se o formato é um array ou contém a chave "questions".'
      );
    }

    return mapParsedToQuestionItems(items);
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setImportError(null);
  };

  const handleProcess = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImportError(null);
    setImportPreview(null);

    try {
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();

        if (fileExt === 'json') {
          const text = await selectedFile.text();
          const parsed = parseJsonToQuestions(text);
          if (parsed.length === 0) throw new Error('Nenhuma questão encontrada no arquivo JSON.');
          setImportPreview(parsed);
          return;
        }

        if (fileExt === 'md' || fileExt === 'markdown' || fileExt === 'txt') {
          setIsProcessingAi(true);
          setAiStatusMessage('Lendo Markdown e adaptando questões com IA...');
          const text = await selectedFile.text();
          const aiQuestions = await promptGeminiToParseDocumentToQuizJSON(text, 'markdown');
          const mapped = mapParsedToQuestionItems(aiQuestions as unknown as Array<Record<string, unknown>>);
          setImportPreview(mapped);
          return;
        }

        if (fileExt === 'pdf') {
          setIsProcessingAi(true);
          setAiStatusMessage('Extraindo texto das páginas do PDF...');
          const arrayBuffer = await selectedFile.arrayBuffer();
          const extractedText = await extractTextFromPdf(arrayBuffer);

          if (!extractedText.trim()) {
            throw new Error('Não foi possível extrair texto legível do arquivo PDF.');
          }

          setAiStatusMessage('Analisando exercícios e estruturando questões com IA...');
          const aiQuestions = await promptGeminiToParseDocumentToQuizJSON(extractedText, 'pdf');
          const mapped = mapParsedToQuestionItems(aiQuestions as unknown as Array<Record<string, unknown>>);
          setImportPreview(mapped);
          return;
        }

        throw new Error('Formato de arquivo não suportado. Utilize arquivos .json, .md ou .pdf.');
      }

      // No file selected, parse raw textarea input
      if (!importJsonText.trim()) {
        throw new Error('Cole o JSON ou selecione um arquivo (.json, .md, .pdf) para continuar.');
      }

      // Detect if pasted content is raw Markdown instead of JSON
      const trimmed = importJsonText.trim();
      const looksLikeJson = trimmed.startsWith('[') || trimmed.startsWith('{') || trimmed.startsWith('```json');

      if (!looksLikeJson && (trimmed.includes('#') || trimmed.includes('-') || trimmed.length > 50)) {
        setIsProcessingAi(true);
        setAiStatusMessage('Analisando texto colado com IA...');
        const aiQuestions = await promptGeminiToParseDocumentToQuizJSON(trimmed, 'markdown');
        const mapped = mapParsedToQuestionItems(aiQuestions as unknown as Array<Record<string, unknown>>);
        setImportPreview(mapped);
        return;
      }

      const parsed = parseJsonToQuestions(trimmed);
      if (parsed.length === 0) throw new Error('Nenhuma questão encontrada no texto JSON.');
      setImportPreview(parsed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar as questões.';
      setImportError(msg);
    } finally {
      setIsProcessingAi(false);
      setAiStatusMessage('');
    }
  };

  const handleCopySchemaPrompt = async () => {
    try {
      const prompt = getCadernoQuizJsonSchemaPrompt(
        currentBatteryQuestions.length > 0 ? currentBatteryQuestions : undefined
      );
      await navigator.clipboard.writeText(prompt);
      setCopiedPrompt(true);
      triggerToast('Prompt e formato JSON copiados com sucesso!', 'success', 3500);
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch (err) {
      console.error('Erro ao copiar prompt:', err);
      triggerToast('Erro ao copiar prompt para a área de transferência.', 'error');
    }
  };

  const handleRefineQuestions = async (customInstruction?: string) => {
    const instruction = customInstruction || refinePrompt;
    if (!instruction.trim() || !importPreview || importPreview.length === 0) return;

    setIsRefining(true);
    try {
      const refined = await promptGeminiToRefineImportedQuestions(importPreview, instruction.trim());
      const mapped = mapParsedToQuestionItems(refined as unknown as Array<Record<string, unknown>>);
      setImportPreview(mapped);
      setRefinePrompt('');
      triggerToast('Questões refinadas com sucesso pela IA!', 'success', 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao refinar questões.';
      triggerToast(msg, 'error', 4000);
    } finally {
      setIsRefining(false);
    }
  };

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!importPreview || importPreview.length === 0) return;
    try {
      onImport(importPreview, importMode);
      triggerToast(
        `${importPreview.length} questão(ões) importada(s) com sucesso!`,
        'success',
        3000
      );
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao importar questões.';
      triggerToast(msg, 'error', 4000);
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
        onClick={onClose}
      >
        <div
          className="bg-dark-card border border-purple-500/30 rounded-3xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/20 bg-gradient-to-r from-purple-950/40 via-dark-card to-purple-950/20">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300">
                <UploadCloud size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Importar Questões (JSON, MD, PDF)</h3>
                <p className="text-xs text-purple-200/70">
                  Importe arquivos ou JSON gerado por ChatGPT, Claude, Gemini, DeepSeek
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-dark-subtext hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar bg-black/30 flex-1">
            {!importPreview ? (
              <>
                {/* Banner de Ajuda e Cópia do Prompt para outras IAs */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-purple-950/30 border border-purple-500/25 rounded-2xl">
                  <div className="flex items-center gap-2 text-xs text-purple-200/90">
                    <Sparkles size={16} className="text-purple-400 shrink-0" />
                    <span>
                      Vai gerar questões no ChatGPT, Claude ou DeepSeek? Copie o prompt padrão com nosso schema JSON:
                    </span>
                  </div>
                  <button
                    onClick={handleCopySchemaPrompt}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-semibold transition-all hover:text-white"
                  >
                    {copiedPrompt ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    <span>{copiedPrompt ? 'Copiado!' : 'Copiar Prompt para IA'}</span>
                  </button>
                </div>

                {/* Upload Zone (Drag & Drop ou File Selector) */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileSelect(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                    isDragOver
                      ? 'border-purple-400 bg-purple-500/20'
                      : selectedFile
                        ? 'border-purple-500/40 bg-purple-950/20'
                        : 'border-white/10 hover:border-purple-500/30 bg-black/40 hover:bg-purple-950/10'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.md,.markdown,.pdf,.txt,application/json,text/markdown,text/plain,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />

                  {selectedFile ? (
                    <div
                      className="flex items-center justify-between w-full max-w-md p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {selectedFile.name.endsWith('.json') ? (
                          <FileCode className="text-purple-400 shrink-0" size={18} />
                        ) : selectedFile.name.endsWith('.pdf') ? (
                          <FileText className="text-red-400 shrink-0" size={18} />
                        ) : (
                          <FileText className="text-blue-400 shrink-0" size={18} />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-purple-100 truncate">{selectedFile.name}</p>
                          <p className="text-[10px] text-purple-300/70">
                            {(selectedFile.size / 1024).toFixed(1)} KB •{' '}
                            {selectedFile.name.endsWith('.json')
                              ? 'Processamento Local'
                              : 'Estruturação Automática via IA'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-1 rounded-lg hover:bg-white/10 text-dark-subtext hover:text-red-400 transition-colors"
                        title="Remover arquivo"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="p-2.5 rounded-full bg-purple-500/10 text-purple-300">
                        <Upload size={18} />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-semibold text-purple-200">
                          Arraste e solte um arquivo <span className="text-purple-400 font-mono">.json</span>,{' '}
                          <span className="text-purple-400 font-mono">.md</span> ou{' '}
                          <span className="text-purple-400 font-mono">.pdf</span>
                        </p>
                        <p className="text-[11px] text-purple-300/60 mt-0.5">
                          ou clique para selecionar do seu dispositivo
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Divisor "ou cole o texto" */}
                {!selectedFile && (
                  <>
                    <div className="flex items-center gap-3 text-dark-subtext text-[11px]">
                      <div className="h-px bg-white/10 flex-1" />
                      <span>ou cole o JSON/Texto diretamente</span>
                      <div className="h-px bg-white/10 flex-1" />
                    </div>

                    <textarea
                      value={importJsonText}
                      onChange={(e) => {
                        setImportJsonText(e.target.value);
                        setImportError(null);
                      }}
                      placeholder={
                        'Cole aqui o JSON ou texto com questões...\n\nExemplo:\n{\n  "questions": [\n    {\n      "type": "multiple_choice",\n      "question": "Qual é a capital da França?",\n      "options": ["A) Londres", "B) Berlim", "C) Paris", "D) Madri"],\n      "correct_option": "C) Paris",\n      "explanation": "Paris é a capital e a cidade mais populosa da França."\n    }\n  ]\n}'
                      }
                      className="w-full h-44 bg-black/50 border border-purple-500/20 focus:border-purple-500/60 rounded-2xl p-4 font-mono text-xs text-purple-100 placeholder-white/20 outline-none resize-none transition-all"
                    />
                  </>
                )}

                {/* Indicador de Processamento com IA */}
                {isProcessingAi && (
                  <div className="flex items-center gap-3 p-4 bg-purple-950/40 border border-purple-500/40 rounded-2xl text-xs text-purple-200 animate-pulse">
                    <Loader2 size={18} className="animate-spin text-purple-400 shrink-0" />
                    <span>{aiStatusMessage || 'Processando com Inteligência Artificial...'}</span>
                  </div>
                )}

                {importError && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                    <span>{importError}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                {/* Cabeçalho do Preview com botão de Voltar */}
                <div className="flex items-center justify-between gap-3 bg-purple-950/40 border border-purple-500/30 p-3.5 rounded-2xl">
                  <span className="text-xs font-bold text-green-300 flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-green-400" />
                    <span>{importPreview.length} questão(ões) identificada(s) com sucesso!</span>
                  </span>
                  <button
                    onClick={() => {
                      setImportPreview(null);
                      setImportError(null);
                    }}
                    className="text-xs text-purple-300 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-white/5 transition-colors border border-purple-500/20 font-medium"
                  >
                    <ArrowLeft size={13} />
                    <span>Escolher outro arquivo/JSON</span>
                  </button>
                </div>

                {/* Barra de Refinamento / Pedidos para a IA */}
                <div className="bg-purple-950/30 border border-purple-500/20 rounded-2xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-purple-300 flex items-center gap-1">
                      <Sparkles size={12} className="text-purple-400" />
                      <span>Refinar com IA (Remover duplicadas ou ajustar questões):</span>
                    </span>
                    <button
                      onClick={() => handleRefineQuestions('Remova quaisquer questões redundantes ou duplicadas da lista')}
                      disabled={isRefining}
                      className="text-[10px] bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30 text-purple-200 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
                    >
                      <Sparkles size={10} />
                      <span>🪄 Remover Duplicadas</span>
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={refinePrompt}
                      onChange={(e) => setRefinePrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleRefineQuestions();
                        }
                      }}
                      placeholder="Ex: Remova a questão 3, transforme a 4 em aberta, ajuste os enunciados..."
                      disabled={isRefining}
                      className="flex-1 bg-black/40 border border-purple-500/20 focus:border-purple-500/50 rounded-xl px-3 py-1.5 text-xs text-purple-100 placeholder-white/20 outline-none"
                    />
                    <button
                      onClick={() => handleRefineQuestions()}
                      disabled={!refinePrompt.trim() || isRefining}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1 shrink-0"
                    >
                      {isRefining ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      <span>Refinar</span>
                    </button>
                  </div>
                </div>

                {/* Lista de Pré-visualização das Questões com Botão de Excluir por Card */}
                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                  {importPreview.map((q, idx) => (
                    <QuizImportPreviewCard
                      key={q.id}
                      question={q}
                      index={idx}
                      onDelete={handleDeleteSingleQuestion}
                    />
                  ))}
                </div>

                {/* Opções de Modo de Importação */}
                <div className="bg-purple-950/20 border border-purple-500/20 rounded-2xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-purple-200">Como deseja importar?</p>
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() => setImportMode('append')}
                      className={`flex-1 py-2 px-3 rounded-xl border font-medium transition-all ${
                        importMode === 'append'
                          ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-600/30'
                          : 'bg-black/30 border-white/10 text-dark-subtext hover:text-white'
                      }`}
                    >
                      ➕ Acrescentar ao final da bateria
                    </button>
                    <button
                      onClick={() => setImportMode('replace')}
                      className={`flex-1 py-2 px-3 rounded-xl border font-medium transition-all ${
                        importMode === 'replace'
                          ? 'bg-red-500/20 border-red-500/40 text-red-300 shadow-md shadow-red-500/10'
                          : 'bg-black/30 border-white/10 text-dark-subtext hover:text-white'
                      }`}
                    >
                      🔄 Substituir todas as questões
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-purple-500/20 bg-gradient-to-r from-purple-950/30 via-dark-card to-purple-950/20">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-dark-subtext hover:text-white rounded-xl hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            {!importPreview ? (
              <button
                onClick={handleProcess}
                disabled={(!selectedFile && !importJsonText.trim()) || isProcessingAi}
                className="px-5 py-2.5 text-xs font-semibold bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5"
              >
                {isProcessingAi ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <UploadCloud size={14} />
                )}
                <span>
                  {selectedFile
                    ? selectedFile.name.endsWith('.json')
                      ? 'Interpretar Arquivo JSON'
                      : 'Analisar Arquivo com IA e Ver Preview'
                    : 'Processar e Ver Preview'}
                </span>
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={importPreview.length === 0}
                className="px-5 py-2.5 text-xs font-semibold bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white rounded-xl shadow-lg shadow-green-600/30 transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} />
                <span>Confirmar Importação ({importPreview.length} questões)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
