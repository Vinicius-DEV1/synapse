import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Check,
  X,
  Trash2,
  PlusCircle,
  Edit3,
  ListOrdered,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { markdownComponents, preprocessMarkdownCode } from '../../utils/markdownPreprocess';
import type { QuestionItem, SuggestedAction } from '../../types';

interface QuizAiActionCardProps {
  action: SuggestedAction;
  actionIdx: number;
  questions: QuestionItem[];
  onAcceptAction: (action: SuggestedAction) => void;
  onRejectAction: (action: SuggestedAction) => void;
}

export function QuizAiActionCard({
  action,
  actionIdx,
  questions,
  onAcceptAction,
  onRejectAction,
}: QuizAiActionCardProps) {
  const isPending = action.status === 'pending';
  const isAccepted = action.status === 'accepted';
  const isRejected = action.status === 'rejected';

  const isCreate = action.actionType === 'create';
  const isEdit = action.actionType === 'edit';
  const isDelete = action.actionType === 'delete';

  const isOpen = action.type === 'open' || action.changes?.type === 'open';

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

      {/* CONTENT: CREATE NEW QUESTION */}
      {isCreate && (
        <div className="space-y-3 pt-1">
          {/* Enunciado */}
          <div className="text-xs font-semibold text-purple-100 leading-relaxed bg-black/30 p-3 rounded-xl border border-white/5">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
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
                          components={markdownComponents}
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
                  components={markdownComponents}
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
                  components={markdownComponents}
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
                  components={markdownComponents}
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

      {/* CONTENT: DELETE QUESTION */}
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
}
