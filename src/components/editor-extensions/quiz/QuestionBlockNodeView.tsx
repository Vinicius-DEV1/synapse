import React, { useState, useRef } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { ChevronUp, GripVertical, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { selectNodeForDrag } from '../group-layout/DragToGroup';
import { moveBlockUp, moveBlockDown } from '../moveBlockCommands';
import QuizBatteryHeader from './components/QuizBatteryHeader';
import QuizTagsFilter from './components/QuizTagsFilter';
import QuizEditor from './components/QuizEditor';
import QuizPlayer from './components/QuizPlayer';
import QuizSequentialPlayer from './components/QuizSequentialPlayer';
import QuizAIAssistant from './components/QuizAIAssistant';
import QuizImportModal from './components/QuizImportModal';
import { QuizDeleteModals } from './components/QuizDeleteModals';
import { useQuizState } from './hooks/useQuizState';
import { useQuizEvaluation } from './hooks/useQuizEvaluation';
import { useQuizAiChat } from './hooks/useQuizAiChat';
import { normalizeChatHistory } from './utils/quizNormalizer';
import type { QuizChatMessage, QuizLayout } from './types';

export default function QuestionBlockNodeView(props: NodeViewProps) {
  const {
    title,
    description,
    isCollapsed,
    mode: rawMode,
    layout: rawLayout,
    questions: rawQuestions,
    aiChatHistory: rawChatHistory,
  } = props.node.attrs;

  const mode: 'edit' | 'practice' = rawMode === 'practice' ? 'practice' : 'edit';
  const layout: QuizLayout = rawLayout === 'sequential' ? 'sequential' : 'list';
  const chatHistory: QuizChatMessage[] = normalizeChatHistory(rawChatHistory);

  const {
    questions,
    displayedQuestions,
    selectedTagFilter,
    setSelectedTagFilter,
    allBatteryTags,
    copiedJson,
    updateQuestions,
    updateSingleQuestion,
    handleToggleQuestionType,
    handleAddQuestion,
    handleMoveQuestion,
    handleRemoveQuestion,
    handleCopyQuestionsJson,
    handleCopySchemaPrompt,
  } = useQuizState(rawQuestions, title, props.updateAttributes);

  const { evaluatingIds, handleEvaluateOpenAnswer } = useQuizEvaluation(updateSingleQuestion);

  const updateChatHistory = (newHistory: QuizChatMessage[]) => {
    props.updateAttributes({ aiChatHistory: newHistory });
  };

  const {
    showAiAssistantModal,
    setShowAiAssistantModal,
    chatInput,
    setChatInput,
    isSendingChat,
    handleSendChatMessage,
    handleAcceptAction,
    handleRejectAction,
    handleAcceptAllInMessage,
    handleRejectAllInMessage,
    handleClearChatHistory,
    handleDiscussInChat,
  } = useQuizAiChat({
    chatHistory,
    updateChatHistory,
    questions,
    updateQuestions,
    updateSingleQuestion,
    handleRemoveQuestion,
    title,
    description,
  });

  // Import and deletion modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [deletingQuestionInfo, setDeletingQuestionInfo] = useState<{
    id: string;
    index: number;
  } | null>(null);
  const [showDeleteContainerModal, setShowDeleteContainerModal] = useState(false);

  const handleSetMode = (newMode: 'edit' | 'practice', e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    props.updateAttributes({ mode: newMode });
  };

  const blockContainerRef = useRef<HTMLDivElement>(null);

  const handleDragMouseDown = () => {
    if (typeof props.getPos === 'function' && props.editor?.view) {
      const pos = props.getPos();
      if (typeof pos === 'number') {
        selectNodeForDrag(props.editor.view, pos, props.node);
      }
    }
  };

  return (
    <NodeViewWrapper className="question-block relative group/quiz my-6 w-full block" contentEditable={false}>
      {/* Alça e controles verticais no gutter esquerdo — APENAS quando a bateria estiver minimizada/recolhida */}
      {isCollapsed && (
        <div
          contentEditable={false}
          className="absolute -left-7 top-1 z-20 flex flex-col items-center gap-0.5 rounded-md border border-white/10 bg-dark-bg/95 p-0.5 text-dark-subtext opacity-0 shadow-lg backdrop-blur-xl transition-all group-hover/quiz:opacity-100"
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (typeof props.getPos === 'function' && props.editor) {
                const pos = props.getPos();
                if (typeof pos === 'number') moveBlockUp(props.editor.view, pos);
              }
            }}
            className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
            title="Subir bateria de exercícios (Mover para cima)"
          >
            <ArrowUp size={11} />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (typeof props.getPos === 'function') {
                const pos = props.getPos();
                if (typeof pos === 'number') {
                  props.editor.chain().focus().insertContentAt(pos + props.node.nodeSize, { type: 'paragraph' }).run();
                }
              }
            }}
            className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
            title="Adicionar linha abaixo (+)"
          >
            <Plus size={11} />
          </button>
          <div
            data-drag-handle
            onMouseDown={handleDragMouseDown}
            className="p-0.5 cursor-grab active:cursor-grabbing hover:text-white transition-colors"
            title="Arrastar bateria de exercícios"
          >
            <GripVertical size={13} />
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (typeof props.getPos === 'function' && props.editor) {
                const pos = props.getPos();
                if (typeof pos === 'number') moveBlockDown(props.editor.view, pos);
              }
            }}
            className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
            title="Descer bateria de exercícios (Mover para baixo)"
          >
            <ArrowDown size={11} />
          </button>
        </div>
      )}

      <div
        ref={blockContainerRef}
        className={`rounded-2xl border border-white/10 bg-dark-card/90 shadow-md hover:border-white/20 transition-all overflow-hidden ${
          isCollapsed ? 'hover:bg-dark-card' : ''
        }`}
      >
        {/* Header Principal */}
        <div
          className={`${
            isCollapsed
              ? 'p-3 md:p-3.5 bg-dark-card/40'
              : 'p-4 md:p-5 border-b border-white/10 bg-white/[0.02]'
          } transition-all`}
        >
          <QuizBatteryHeader
            title={title}
            description={description}
            mode={mode}
            layout={layout}
            isCollapsed={isCollapsed}
            copiedJson={copiedJson}
            questionCount={questions.length}
            onUpdateTitle={(val) => props.updateAttributes({ title: val })}
            onUpdateDescription={(val) => props.updateAttributes({ description: val })}
            onSetMode={handleSetMode}
            onSetLayout={(l) => props.updateAttributes({ layout: l })}
            onOpenAiAssistant={() => setShowAiAssistantModal(true)}
            onOpenImport={() => setShowImportModal(true)}
            onCopyJson={handleCopyQuestionsJson}
            onCopySchemaPrompt={handleCopySchemaPrompt}
            onOpenDeleteModal={() => setShowDeleteContainerModal(true)}
            onToggleCollapse={() => props.updateAttributes({ isCollapsed: !isCollapsed })}
          />

          {/* Filtro por Tags */}
          {!isCollapsed && (
            <QuizTagsFilter
              tags={allBatteryTags}
              questions={questions}
              selectedTagFilter={selectedTagFilter}
              onSelectTag={setSelectedTagFilter}
            />
          )}
        </div>

        {/* Corpo (Lista de Questões) */}
        {!isCollapsed && (
          <div
            className={
              layout === 'sequential' && mode === 'practice'
                ? 'p-4 md:p-5 space-y-4'
                : 'p-6 space-y-6'
            }
          >
            {mode === 'edit' ? (
              <QuizEditor
                questions={displayedQuestions}
                onUpdateQuestion={updateSingleQuestion}
                onToggleQuestionType={handleToggleQuestionType}
                onMoveQuestion={handleMoveQuestion}
                onDeleteQuestion={(id, idx) => setDeletingQuestionInfo({ id, index: idx })}
                onAddQuestion={handleAddQuestion}
              />
            ) : layout === 'sequential' ? (
              <QuizSequentialPlayer
                questions={displayedQuestions}
                onUpdateSingleQuestion={updateSingleQuestion}
                onEvaluateOpenAnswer={handleEvaluateOpenAnswer}
                evaluatingIds={evaluatingIds}
                onDiscussInChat={handleDiscussInChat}
                onSwitchToListLayout={() => props.updateAttributes({ layout: 'list' })}
              />
            ) : (
              <QuizPlayer
                questions={displayedQuestions}
                onUpdateSingleQuestion={updateSingleQuestion}
                onEvaluateOpenAnswer={handleEvaluateOpenAnswer}
                evaluatingIds={evaluatingIds}
                onDiscussInChat={handleDiscussInChat}
              />
            )}

            {/* Botão Voltar ao Topo da Bateria */}
            {questions.length > 1 && (
              <div className="flex justify-center pt-3 pb-1 border-t border-white/5">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    blockContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="flex items-center gap-1.5 text-xs text-dark-subtext hover:text-purple-300 bg-black/40 hover:bg-purple-500/10 border border-white/10 hover:border-purple-500/30 px-4 py-1.5 rounded-full transition-all duration-200 group shadow-sm"
                  title="Rolar suavemente até o topo desta bateria de questões"
                >
                  <ChevronUp size={14} className="group-hover:-translate-y-0.5 transition-transform text-purple-400" />
                  <span>Voltar ao topo da bateria</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Assistente IA */}
      <QuizAIAssistant
        isOpen={showAiAssistantModal}
        onClose={() => setShowAiAssistantModal(false)}
        chatHistory={chatHistory}
        chatInput={chatInput}
        setChatInput={setChatInput}
        isSendingChat={isSendingChat}
        onSendMessage={handleSendChatMessage}
        onClearHistory={handleClearChatHistory}
        onAcceptAction={handleAcceptAction}
        onRejectAction={handleRejectAction}
        onAcceptAllInMessage={handleAcceptAllInMessage}
        onRejectAllInMessage={handleRejectAllInMessage}
        questions={questions}
        currentBatteryTitle={title}
      />

      {/* Modal Importar JSON / MD / PDF */}
      <QuizImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        currentBatteryQuestions={questions}
        onImport={(imported, importMode) => {
          if (importMode === 'replace') {
            updateQuestions(imported);
          } else {
            const base = questions.length === 1 && !String(questions[0]?.question || '').trim() ? [] : questions;
            updateQuestions([...base, ...imported]);
          }
        }}
      />

      {/* Modais de Exclusão */}
      <QuizDeleteModals
        deletingQuestionInfo={deletingQuestionInfo}
        onCancelDeleteQuestion={() => setDeletingQuestionInfo(null)}
        onConfirmDeleteQuestion={(id) => {
          handleRemoveQuestion(id);
          setDeletingQuestionInfo(null);
        }}
        showDeleteContainerModal={showDeleteContainerModal}
        totalQuestions={questions.length}
        onCancelDeleteContainer={() => setShowDeleteContainerModal(false)}
        onConfirmDeleteContainer={() => {
          setShowDeleteContainerModal(false);
          props.deleteNode();
        }}
      />
    </NodeViewWrapper>
  );
}
