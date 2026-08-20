import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, UploadCloud, CheckCircle2, AlertCircle, ArrowLeft, Tag, FileText, ListOrdered } from 'lucide-react';
import { Portal } from '../../../ui/Portal';
import { triggerToast } from '../../../ui/ToastContext';
import { sanitizeExpectedAnswer } from '../../../../services/gemini';
import { markdownComponents, preprocessMarkdownCode } from '../utils/markdownPreprocess';
import type { QuestionItem } from '../types';

interface QuizImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (questions: QuestionItem[], mode: 'replace' | 'append') => void;
}

export default function QuizImportModal({ isOpen, onClose, onImport }: QuizImportModalProps) {
  const [importJsonText, setImportJsonText] = useState('');
  const [importPreview, setImportPreview] = useState<QuestionItem[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('append');

  if (!isOpen) return null;

  const parseJsonToQuestions = (raw: string): QuestionItem[] => {
    const json = JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim());

    const items: any[] = Array.isArray(json)
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
        'Não encontrei uma lista de questões no JSON. Verifique se o campo "questions" (ou "questoes") existe e é um array.'
      );
    }

    return items.map((item, idx): QuestionItem => {
      const rawType = (item.type || item.tipo || '').toLowerCase();
      const isOpenQuestion =
        rawType.includes('open') ||
        rawType.includes('aberta') ||
        rawType.includes('discursiva') ||
        rawType.includes('dissertativa');

      let options: string[] = [];
      const rawOpts =
        item.options || item.alternativas || item.opcoes || item.alternatives || [];
      if (Array.isArray(rawOpts) && rawOpts.length >= 2) {
        options = rawOpts.map((o: any) => {
          const str = typeof o === 'string' ? o : String(o);
          return str.replace(/^[A-Za-z0-9][).]\s+/, '').trim();
        });
      }
      if (!isOpenQuestion && options.length < 2) options = ['', '', '', ''];

      let correctIndex = 0;
      const rawCorrect =
        item.correct_option ||
        item.resposta_correta ||
        (item.correctIndex ?? item.correctAnswerIndex);
      if (typeof rawCorrect === 'number') {
        correctIndex = rawCorrect;
      } else if (typeof rawCorrect === 'string') {
        const letter = rawCorrect.trim().toUpperCase().charCodeAt(0);
        if (letter >= 65 && letter <= 90) {
          correctIndex = letter - 65;
        }
      }

      return {
        id: `q_import_${Date.now()}_${idx}`,
        type: isOpenQuestion ? 'open' : 'multiple_choice',
        question: item.question || item.enunciado || item.pergunta || item.texto || '',
        options: options.length >= 2 ? options : ['', '', '', ''],
        correctIndex,
        tags: Array.isArray(item.tags)
          ? item.tags
          : Array.isArray(item.topicos)
            ? item.topicos
            : [],
        selectedIndex: null,
        expectedAnswer: sanitizeExpectedAnswer(
          item.expected_answer || item.resposta_esperada || item.gabarito || item.answer || ''
        ),
        userTypedAnswer: '',
        aiFeedback: null,
        explanation:
          item.explanation || item.explicacao || item.justificativa || item.comentario || '',
        showExplanation: false,
        answered: false,
      };
    });
  };

  const handleParse = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImportError(null);
    setImportPreview(null);
    try {
      if (!importJsonText.trim()) {
        throw new Error('Cole o JSON na área de texto antes de continuar.');
      }
      const parsed = parseJsonToQuestions(importJsonText);
      if (parsed.length === 0) throw new Error('Nenhuma questão encontrada no JSON.');
      setImportPreview(parsed);
    } catch (err: any) {
      setImportError(err.message || 'Erro ao interpretar o JSON.');
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
    } catch (err: any) {
      triggerToast(err?.message || 'Erro ao importar questões.', 'error', 4000);
    }
  };

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
                <h3 className="text-base font-bold text-white">Importar Questões via JSON</h3>
                <p className="text-xs text-purple-200/70">
                  Importe exercícios exportados ou gerados por qualquer chatbot de IA
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
                <p className="text-xs text-purple-200/80 leading-relaxed">
                  Cole abaixo o JSON gerado pelo seu modelo de IA favorito (ChatGPT, Claude, Gemini, DeepSeek, etc.) ou exportado anteriormente.
                </p>

                <textarea
                  value={importJsonText}
                  onChange={(e) => {
                    setImportJsonText(e.target.value);
                    setImportError(null);
                  }}
                  placeholder={'Cole aqui o JSON das questões...\n\nExemplo:\n{\n  "questions": [\n    {\n      "type": "multiple_choice",\n      "question": "Qual é a capital da França?",\n      "options": ["A) Londres", "B) Berlim", "C) Paris", "D) Madri"],\n      "correct_option": "C) Paris",\n      "explanation": "Paris é a capital e a cidade mais populosa da França."\n    }\n  ]\n}'}
                  className="w-full h-56 bg-black/50 border border-purple-500/20 focus:border-purple-500/60 rounded-2xl p-4 font-mono text-xs text-purple-100 placeholder-white/20 outline-none resize-none transition-all"
                />

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
                    <span>Editar JSON</span>
                  </button>
                </div>

                {/* Lista de Pré-visualização das Questões */}
                <div className="space-y-3 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
                  {importPreview.map((q, idx) => (
                    <div
                      key={q.id}
                      className="bg-dark-card border border-purple-500/20 rounded-2xl p-4 text-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 rounded font-mono">
                            Questão {idx + 1}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full border bg-purple-500/10 text-purple-200 border-purple-500/20 flex items-center gap-1">
                            {q.type === 'open' ? <FileText size={10} /> : <ListOrdered size={10} />}
                            <span>{q.type === 'open' ? 'Questão Aberta' : 'Múltipla Escolha'}</span>
                          </span>
                        </div>

                        {q.tags && q.tags.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {q.tags.map((tag, tIdx) => (
                              <span
                                key={tIdx}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-purple-300 border border-white/10 flex items-center gap-0.5"
                              >
                                <Tag size={8} />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="font-semibold text-purple-100 leading-relaxed">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={markdownComponents as any}
                        >
                          {preprocessMarkdownCode(q.question || 'Sem enunciado')}
                        </ReactMarkdown>
                      </div>

                      {q.type === 'multiple_choice' && q.options.filter((o) => o).length > 0 && (
                        <div className="space-y-1 pl-1">
                          {q.options.map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className={`p-1.5 rounded-lg text-xs flex items-center gap-2 ${
                                oIdx === q.correctIndex
                                  ? 'bg-green-500/15 border border-green-500/30 text-green-300 font-semibold'
                                  : 'text-purple-200/80'
                              }`}
                            >
                              <span className="font-mono font-bold text-[10px]">
                                {String.fromCharCode(65 + oIdx)})
                              </span>
                              <span>{opt || '—'}</span>
                              {oIdx === q.correctIndex && (
                                <span className="text-[10px] font-bold text-green-400 ml-auto">✓ Correta</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {q.type === 'open' && q.expectedAnswer && (
                        <p className="text-[11px] text-purple-200 bg-purple-950/30 p-2 rounded-lg border border-purple-500/20">
                          <strong className="text-purple-300">📌 Gabarito:</strong> {q.expectedAnswer}
                        </p>
                      )}

                      {q.explanation && (
                        <p className="text-[11px] text-purple-200/80 bg-black/20 p-2 rounded-lg border border-white/5">
                          <strong className="text-purple-300">💡 Explicação:</strong> {q.explanation}
                        </p>
                      )}
                    </div>
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
                onClick={handleParse}
                disabled={!importJsonText.trim()}
                className="px-5 py-2.5 text-xs font-semibold bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5"
              >
                <UploadCloud size={14} />
                <span>Interpretar JSON e Ver Preview</span>
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                className="px-5 py-2.5 text-xs font-semibold bg-green-600 hover:bg-green-500 text-white rounded-xl shadow-lg shadow-green-600/30 transition-all flex items-center gap-1.5"
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
