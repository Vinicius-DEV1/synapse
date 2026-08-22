import { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Check,
  CheckCheck,
  Trash2,
  PlusCircle,
  Edit3,
  Tag,
  ListOrdered,
  FileText,
  CheckCircle2,
  AtSign,
  Layers,
} from 'lucide-react';
import { Portal } from '../../../ui/Portal';
import { markdownComponents, preprocessMarkdownCode } from '../utils/markdownPreprocess';
import { useQuizBatteryMentions } from '../hooks/useQuizBatteryMentions';
import type { QuestionItem, QuizChatMessage, SuggestedAction, ReferencedBattery } from '../types';

interface QuizAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  chatHistory: QuizChatMessage[];
  chatInput: string;
  setChatInput: (input: string) => void;
  isSendingChat: boolean;
  onSendMessage: (override?: string, referencedBatteries?: ReferencedBattery[]) => Promise<void>;
  onClearHistory: () => void;
  onAcceptAction: (action: SuggestedAction) => void;
  onRejectAction: (action: SuggestedAction) => void;
  onAcceptAllInMessage?: (msgId: string) => void;
  onRejectAllInMessage?: (msgId: string) => void;
  questions: QuestionItem[];
  currentBatteryTitle?: string;
}

export default function QuizAIAssistant({
  isOpen,
  onClose,
  chatHistory,
  chatInput,
  setChatInput,
  isSendingChat,
  onSendMessage,
  onClearHistory,
  onAcceptAction,
  onRejectAction,
  onAcceptAllInMessage,
  onRejectAllInMessage,
  questions,
  currentBatteryTitle,
}: QuizAIAssistantProps) {
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const {
    attachedBatteries,
    showMentionMenu,
    setShowMentionMenu,
    mentionQuery,
    mentionSelectedIndex,
    filteredBatteries,
    handleAttachBattery,
    handleRemoveBattery,
    handleInputChange,
    handleKeyDown: handleMentionKeyDown,
  } = useQuizBatteryMentions(chatInput, setChatInput, currentBatteryTitle);

  useEffect(() => {
    if (isOpen && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [isOpen, chatHistory, isSendingChat]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
        onClick={onClose}
      >
        <div
          className="bg-dark-card border border-purple-500/30 rounded-3xl w-full max-w-4xl h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/20 bg-gradient-to-r from-purple-950/50 via-dark-card to-purple-950/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-300 shadow-md shadow-purple-500/10">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight flex items-center gap-2">
                  <span>Assistente de IA para Exercícios</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-full font-semibold">
                    Gemini AI
                  </span>
                </h3>
                <p className="text-xs text-purple-200/70">
                  Crie, aprimore, avalie e revise suas questões interativamente
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {chatHistory.length > 0 && (
                <button
                  onClick={onClearHistory}
                  className="text-xs text-dark-subtext hover:text-red-400 px-3 py-1.5 rounded-xl hover:bg-white/5 transition-colors flex items-center gap-1.5 border border-white/5"
                  title="Limpar histórico da conversa"
                >
                  <Trash2 size={13} />
                  <span>Limpar Histórico</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-dark-subtext hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                title="Fechar (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div
            ref={chatScrollRef}
            className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar bg-black/40"
          >
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="w-14 h-14 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/10">
                  <Sparkles size={28} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-purple-100">
                    Como posso te ajudar com esta bateria de exercícios hoje?
                  </h4>
                  <p className="text-xs text-dark-subtext max-w-md">
                    Peça novas questões, correções didáticas, ajustes de pegadinhas ou explicações aprofundadas.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2.5 max-w-xl pt-2">
                  <button
                    onClick={() =>
                      onSendMessage(
                        'Crie 3 questões de nível intermediário sobre este tema com explicações didáticas detalhadas.'
                      )
                    }
                    className="text-xs px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-purple-200 hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <PlusCircle size={13} className="text-purple-400" />
                    <span>Gerar 3 questões intermediárias</span>
                  </button>
                  <button
                    onClick={() =>
                      onSendMessage(
                        'Crie 2 questões discursivas (abertas) com gabarito de referência completo e detalhado.'
                      )
                    }
                    className="text-xs px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-purple-200 hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <FileText size={13} className="text-purple-400" />
                    <span>Gerar 2 questões abertas com gabarito</span>
                  </button>
                  <button
                    onClick={() =>
                      onSendMessage(
                        'Revise a didática das alternativas de todas as questões, eliminando ambiguidades e melhorando os distratores.'
                      )
                    }
                    className="text-xs px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-purple-200 hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Edit3 size={13} className="text-purple-400" />
                    <span>Revisar distratores e clareza</span>
                  </button>
                  <button
                    onClick={() =>
                      onSendMessage(
                        'Adicione tags temáticas relevantes e aprofunde as explicações do gabarito das questões.'
                      )
                    }
                    className="text-xs px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-purple-200 hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Tag size={13} className="text-purple-400" />
                    <span>Adicionar tags e aprofundar gabarito</span>
                  </button>
                </div>
              </div>
            ) : (
              chatHistory.map((msg) => {
                const isUser = msg.role === 'user';
                const actions = msg.suggestedActions || [];
                const pendingActions = actions.filter((a) => a.status === 'pending');
                const acceptedActions = actions.filter((a) => a.status === 'accepted');

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[92%] rounded-2xl p-4 text-xs leading-relaxed space-y-3 shadow-lg ${
                        isUser
                          ? 'bg-purple-600 text-white shadow-purple-600/20'
                          : 'bg-dark-card border border-purple-500/20 text-purple-100'
                      }`}
                    >
                      {/* Texto da mensagem */}
                      <div className="leading-relaxed">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={markdownComponents as any}
                        >
                          {preprocessMarkdownCode(msg.text)}
                        </ReactMarkdown>
                      </div>

                      {/* Sugestões de Ação da IA */}
                      {actions.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-purple-500/20 space-y-3">
                          {/* Header das Ações com Botões em Lote */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles size={13} className="text-purple-400" />
                                <span>Ações Propostas ({actions.length}):</span>
                              </span>
                              {acceptedActions.length > 0 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-300">
                                  {acceptedActions.length} aplicada(s)
                                </span>
                              )}
                            </div>

                            {pendingActions.length > 0 && (
                              <div className="flex items-center gap-1.5">
                                {onAcceptAllInMessage && (
                                  <button
                                    onClick={() => onAcceptAllInMessage(msg.id)}
                                    className="px-2.5 py-1 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold text-[11px] transition-all flex items-center gap-1 shadow-md shadow-green-600/20"
                                    title="Aplicar todas as ações pendentes na bateria"
                                  >
                                    <CheckCheck size={13} />
                                    <span>Aplicar Todas ({pendingActions.length})</span>
                                  </button>
                                )}
                                {onRejectAllInMessage && (
                                  <button
                                    onClick={() => onRejectAllInMessage(msg.id)}
                                    className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 rounded-lg font-medium text-[11px] transition-colors flex items-center gap-1"
                                    title="Rejeitar todas as ações pendentes"
                                  >
                                    <X size={13} />
                                    <span>Rejeitar Todas</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Lista de Cards de Ações Propostas */}
                          <div className="space-y-3">
                            {actions.map((action, actionIdx) => {
                              const isPending = action.status === 'pending';
                              const isAccepted = action.status === 'accepted';
                              const isRejected = action.status === 'rejected';

                              const isCreate = action.actionType === 'create';
                              const isEdit = action.actionType === 'edit';
                              const isDelete = action.actionType === 'delete';

                              const isOpen = action.type === 'open' || action.changes?.type === 'open';

                              // Obter questão de destino (para edit/delete)
                              const targetQ =
                                typeof action.targetQuestionIndex === 'number'
                                  ? questions[action.targetQuestionIndex]
                                  : null;

                              return (
                                <div
                                  key={action.id || `action_${actionIdx}`}
                                  className={`p-4 rounded-2xl border text-xs space-y-3 transition-all ${
                                    isAccepted
                                      ? 'bg-green-950/20 border-green-500/40 text-green-100 shadow-md shadow-green-950/30'
                                      : isRejected
                                        ? 'bg-red-950/10 border-red-500/20 text-red-300 opacity-60 line-through'
                                        : 'bg-purple-950/30 border-purple-500/30 text-purple-100 hover:border-purple-500/50 shadow-md'
                                  }`}
                                >
                                  {/* Cabeçalho do Card da Ação */}
                                  <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-2.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span
                                        className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-lg border font-mono ${
                                          isCreate
                                            ? 'bg-green-500/20 text-green-300 border-green-500/30'
                                            : isEdit
                                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                              : 'bg-red-500/20 text-red-300 border-red-500/30'
                                        }`}
                                      >
                                        {isCreate && <PlusCircle size={13} className="text-green-400" />}
                                        {isEdit && <Edit3 size={13} className="text-amber-400" />}
                                        {isDelete && <Trash2 size={13} className="text-red-400" />}
                                        <span>
                                          {isCreate && 'Criar Nova Questão'}
                                          {isEdit && `Editar Questão #${(action.targetQuestionIndex ?? 0) + 1}`}
                                          {isDelete && `Excluir Questão #${(action.targetQuestionIndex ?? 0) + 1}`}
                                        </span>
                                      </span>

                                      {/* Badge de Tipo */}
                                      {isCreate && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                                          {isOpen ? <FileText size={10} /> : <ListOrdered size={10} />}
                                          <span>{isOpen ? 'Questão Aberta' : 'Múltipla Escolha'}</span>
                                        </span>
                                      )}

                                      {/* Tags */}
                                      {action.tags && action.tags.length > 0 && (
                                        <div className="flex items-center gap-1 flex-wrap">
                                          {action.tags.map((t, tIdx) => (
                                            <span
                                              key={tIdx}
                                              className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-purple-200 border border-white/10"
                                            >
                                              #{t}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* Botões de Ação V/X */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {isPending && (
                                        <>
                                          <button
                                            onClick={() => onAcceptAction(action)}
                                            className="px-2.5 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold flex items-center gap-1 text-[11px] transition-all shadow-md shadow-green-500/20"
                                            title="Aplicar esta sugestão na bateria"
                                          >
                                            <Check size={12} />
                                            <span>Aplicar</span>
                                          </button>
                                          <button
                                            onClick={() => onRejectAction(action)}
                                            className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg font-medium flex items-center gap-1 text-[11px] transition-colors"
                                            title="Rejeitar esta sugestão"
                                          >
                                            <X size={12} />
                                            <span>Rejeitar</span>
                                          </button>
                                        </>
                                      )}

                                      {!isPending && (
                                        <span
                                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                                            isAccepted
                                              ? 'bg-green-500/20 border-green-500/30 text-green-300'
                                              : 'bg-red-500/20 border-red-500/30 text-red-300'
                                          }`}
                                        >
                                          {isAccepted ? <Check size={12} /> : <X size={12} />}
                                          <span>{isAccepted ? 'Aplicado' : 'Rejeitado'}</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* CONTEÚDO: CRIAR NOVA QUESTÃO */}
                                  {isCreate && (
                                    <div className="space-y-3 pt-1">
                                      {/* Enunciado */}
                                      <div className="text-xs font-semibold text-purple-100 leading-relaxed bg-black/30 p-3 rounded-xl border border-white/5">
                                        <ReactMarkdown
                                          remarkPlugins={[remarkGfm]}
                                          components={markdownComponents as any}
                                        >
                                          {preprocessMarkdownCode(action.question || 'Sem enunciado')}
                                        </ReactMarkdown>
                                      </div>

                                      {/* Alternativas (Múltipla Escolha) */}
                                      {!isOpen && action.options && action.options.length > 0 && (
                                        <div className="space-y-1.5 pl-1">
                                          <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">
                                            Alternativas:
                                          </span>
                                          <div className="grid grid-cols-1 gap-1.5">
                                            {action.options.map((opt, oIdx) => {
                                              const letter = String.fromCharCode(65 + oIdx);
                                              const isCorrect = oIdx === action.correctIndex;
                                              return (
                                                <div
                                                  key={oIdx}
                                                  className={`p-2.5 rounded-xl border flex items-start gap-2.5 text-xs transition-colors ${
                                                    isCorrect
                                                      ? 'bg-green-500/15 border-green-500/40 text-green-200 font-semibold'
                                                      : 'bg-black/20 border-white/5 text-purple-200'
                                                  }`}
                                                >
                                                  <span
                                                    className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                                                      isCorrect
                                                        ? 'bg-green-500 text-white'
                                                        : 'bg-black/40 text-dark-subtext border border-white/10'
                                                    }`}
                                                  >
                                                    {letter}
                                                  </span>
                                                  <div className="flex-1 pt-0.5 leading-relaxed">
                                                    <ReactMarkdown
                                                      remarkPlugins={[remarkGfm]}
                                                      components={markdownComponents as any}
                                                    >
                                                      {preprocessMarkdownCode(opt)}
                                                    </ReactMarkdown>
                                                  </div>
                                                  {isCorrect && (
                                                    <span className="text-[10px] font-bold text-green-400 bg-green-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
                                                      <CheckCircle2 size={11} /> Correta
                                                    </span>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}

                                      {/* Resposta Esperada (Questão Aberta) */}
                                      {isOpen && action.expectedAnswer && (
                                        <div className="p-3 bg-purple-950/40 border border-purple-500/20 rounded-xl space-y-1">
                                          <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">
                                            📌 Resposta Esperada / Gabarito:
                                          </span>
                                          <div className="text-xs text-purple-100 leading-relaxed">
                                            <ReactMarkdown
                                              remarkPlugins={[remarkGfm]}
                                              components={markdownComponents as any}
                                            >
                                              {preprocessMarkdownCode(action.expectedAnswer)}
                                            </ReactMarkdown>
                                          </div>
                                        </div>
                                      )}

                                      {/* Explicação Pedagógica */}
                                      {action.explanation && (
                                        <div className="p-3 bg-black/20 border border-white/5 rounded-xl space-y-1">
                                          <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">
                                            💡 Explicação do Gabarito:
                                          </span>
                                          <div className="text-xs text-purple-200/90 leading-relaxed">
                                            <ReactMarkdown
                                              remarkPlugins={[remarkGfm]}
                                              components={markdownComponents as any}
                                            >
                                              {preprocessMarkdownCode(action.explanation)}
                                            </ReactMarkdown>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* CONTEÚDO: EDITAR QUESTÃO */}
                                  {isEdit && (
                                    <div className="space-y-2 pt-1 text-xs">
                                      {action.changes?.question && (
                                        <div className="space-y-1">
                                          <p className="text-dark-subtext line-through opacity-70">
                                            Antes: {targetQ?.question || '—'}
                                          </p>
                                          <div className="text-amber-300 font-semibold bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                                            <ReactMarkdown
                                              remarkPlugins={[remarkGfm]}
                                              components={markdownComponents as any}
                                            >
                                              {preprocessMarkdownCode(action.changes.question)}
                                            </ReactMarkdown>
                                          </div>
                                        </div>
                                      )}

                                      {action.changes?.options && (
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-bold text-amber-300 uppercase">
                                            Novas Alternativas:
                                          </span>
                                          <div className="grid grid-cols-1 gap-1">
                                            {action.changes.options.map((opt, oIdx) => (
                                              <div
                                                key={oIdx}
                                                className={`p-2 rounded-lg border text-xs ${
                                                  oIdx === (action.changes?.correctIndex ?? targetQ?.correctIndex)
                                                    ? 'bg-green-500/15 border-green-500/30 text-green-300 font-semibold'
                                                    : 'bg-black/20 border-white/5 text-purple-200'
                                                }`}
                                              >
                                                {String.fromCharCode(65 + oIdx)}) {opt}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {action.changes?.expectedAnswer && (
                                        <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                                          <span className="text-[10px] font-bold text-amber-300 uppercase">
                                            📌 Novo Gabarito de Referência:
                                          </span>
                                          <p className="text-purple-100">{action.changes.expectedAnswer}</p>
                                        </div>
                                      )}

                                      {action.changes?.explanation && (
                                        <div className="p-2.5 bg-purple-950/40 border border-purple-500/20 rounded-xl space-y-1">
                                          <span className="text-[10px] font-bold text-purple-300 uppercase">
                                            💡 Nova Explicação:
                                          </span>
                                          <p className="text-purple-200">{action.changes.explanation}</p>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* CONTEÚDO: EXCLUIR QUESTÃO */}
                                  {isDelete && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-1.5 text-xs">
                                      <span className="text-[10px] font-bold text-red-300 uppercase block">
                                        Questão a ser removida:
                                      </span>
                                      <p className="font-semibold text-red-200 leading-snug">
                                        "{targetQ?.question || 'Questão não encontrada'}"
                                      </p>
                                    </div>
                                  )}

                                  {/* Motivo da Ação */}
                                  {action.reason && (
                                    <p className="text-[11px] text-purple-300/80 italic pt-1 border-t border-white/5">
                                      💬 Motivo: {action.reason}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {isSendingChat && (
              <div className="flex items-center gap-2.5 text-purple-300 text-xs p-3.5 bg-purple-950/40 border border-purple-500/30 rounded-2xl w-fit shadow-lg shadow-purple-950/30">
                <Loader2 size={16} className="animate-spin text-purple-400" />
                <span className="font-medium">O Gemini está gerando as sugestões para a sua bateria...</span>
              </div>
            )}
          </div>

          {/* Chips de Baterias Referenciadas */}
          {attachedBatteries.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap px-5 py-2.5 border-t border-purple-500/20 bg-dark-bg/80">
              <span className="text-[11px] text-purple-300 font-semibold flex items-center gap-1.5">
                <Layers size={13} className="text-purple-400" />
                <span>Baterias de Referência ({attachedBatteries.length}):</span>
              </span>
              {attachedBatteries.map((b) => (
                <span
                  key={b.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-200 text-xs font-medium shadow-sm animate-fade-in"
                >
                  <span className="font-semibold">@{b.title}</span>
                  <span className="text-[10px] opacity-75">({b.questionCount} q.)</span>
                  <button
                    onClick={() => handleRemoveBattery(b.id)}
                    className="hover:text-white hover:bg-white/10 p-0.5 rounded transition-colors ml-0.5"
                    title="Remover referência"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <span className="text-[10px] text-dark-subtext italic ml-auto hidden sm:inline">
                A IA evitará repetir questões já existentes nessas baterias
              </span>
            </div>
          )}

          {/* Chat Input & Mention Menu */}
          <div className="p-4 border-t border-purple-500/20 bg-gradient-to-r from-purple-950/30 via-dark-card to-purple-950/20 relative flex items-center gap-3">
            {/* Popover de Menções com @ */}
            {showMentionMenu && (
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-dark-card border border-purple-500/40 rounded-2xl shadow-2xl overflow-hidden z-30 max-h-64 flex flex-col animate-fade-in">
                <div className="px-3.5 py-2 bg-purple-950/70 border-b border-purple-500/20 text-[11px] font-semibold text-purple-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <AtSign size={13} className="text-purple-400" />
                    <span>Referenciar Bateria de Exercícios</span>
                  </span>
                  <span className="text-[10px] text-dark-subtext">Use ↑ ↓ e Enter para selecionar</span>
                </div>
                <div className="overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                  {filteredBatteries.length === 0 ? (
                    <div className="p-4 text-center text-xs text-dark-subtext">
                      Nenhuma bateria de exercícios encontrada {mentionQuery ? `com "${mentionQuery}"` : 'no app'}.
                    </div>
                  ) : (
                    filteredBatteries.map((b, idx) => {
                      const isSelected = idx === mentionSelectedIndex;
                      return (
                        <button
                          key={b.id}
                          onClick={() => handleAttachBattery(b)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-3 transition-colors ${
                            isSelected
                              ? 'bg-purple-600 text-white font-medium shadow-sm'
                              : 'hover:bg-white/5 text-purple-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="p-1 rounded-lg bg-black/40 border border-white/10 text-purple-300 text-xs shrink-0">
                              🎯
                            </span>
                            <div className="truncate">
                              <span className="font-semibold block truncate">{b.title}</span>
                              <span className={`block text-[10px] truncate ${isSelected ? 'text-purple-200' : 'text-dark-subtext'}`}>
                                Página: {b.pageTitle}
                              </span>
                            </div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-mono ${
                            isSelected ? 'bg-purple-700 text-purple-100' : 'bg-white/5 text-purple-300 border border-white/5'
                          }`}>
                            {b.questionCount} {b.questionCount === 1 ? 'questão' : 'questões'}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <div className="relative flex-1">
              <input
                type="text"
                value={chatInput}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  const intercepted = handleMentionKeyDown(e);
                  if (intercepted) return;

                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSendMessage(undefined, attachedBatteries);
                  }
                }}
                placeholder="Digite seu pedido para a IA... (dica: digite @ para referenciar outras baterias)"
                className="w-full bg-black/50 border border-purple-500/20 focus:border-purple-500/60 rounded-xl pl-4 pr-10 py-3 text-xs text-purple-100 placeholder-white/25 outline-none transition-all shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowMentionMenu((prev) => !prev)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors text-xs flex items-center gap-0.5 ${
                  showMentionMenu ? 'bg-purple-500/30 text-white' : 'text-purple-400/60 hover:text-purple-300'
                }`}
                title="Referenciar outra bateria de exercícios (@)"
              >
                <AtSign size={14} />
              </button>
            </div>

            <button
              onClick={() => onSendMessage(undefined, attachedBatteries)}
              disabled={isSendingChat || !chatInput.trim()}
              className="px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl shadow-lg shadow-purple-600/30 transition-all font-semibold text-xs flex items-center gap-2 shrink-0"
            >
              {isSendingChat ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
              <span>Enviar</span>
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
