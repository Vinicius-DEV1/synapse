import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { QuizSequentialFocusModal } from './components/sequential/QuizSequentialFocusModal';
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

  // Listen for questions appended externally (e.g. from Document AI Assistant)
  useEffect(() => {
    const handleAppend = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || !Array.isArray(detail.questions) || detail.questions.length === 0) return;

      const matchesTitle =
        detail.batteryTitle &&
        String(detail.batteryTitle).trim().toLowerCase() === String(title || '').trim().toLowerCase();
      const matchesId =
        detail.batteryId &&
        (detail.batteryId === props.node.attrs.id || String(detail.batteryId).includes(String(title || '')));

      if (matchesTitle || matchesId) {
        updateQuestions([...questions, ...detail.questions]);
      }
    };

    window.addEventListener('caderno-append-quiz-questions', handleAppend);
    return () => window.removeEventListener('caderno-append-quiz-questions', handleAppend);
  }, [title, questions, updateQuestions, props.node.attrs.id]);

  // Import, focus and deletion modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [isFocusModeOpen, setIsFocusModeOpen] = useState(false);
  const [sequentialActiveIndex, setSequentialActiveIndex] = useState(0);
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

  const handleScrollToTop = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const container = blockContainerRef.current;
    if (!container) return;

    // Find the scrollable page container (#page-view-scroll or closest overflow-y-auto)
    const scrollParent =
      container.closest<HTMLElement>('#page-view-scroll, .overflow-y-auto') ||
      document.getElementById('page-view-scroll');

    if (scrollParent) {
      const targetRect = container.getBoundingClientRect();
      const parentRect = scrollParent.getBoundingClientRect();
      const relativeOffset = targetRect.top - parentRect.top;
      // Scroll strictly within the page container, preserving TabBar and window scroll
      const targetScrollTop = scrollParent.scrollTop + relativeOffset - 20;

      scrollParent.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth',
      });
    } else {
      // Fallback without forcing viewport top alignment
      container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, []);

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
        className={`rounded-2xl border transition-all duration-200 relative overflow-visible ${
          props.selected
            ? 'ring-2 ring-brand-400/70 border-brand-400/90 shadow-[0_0_16px_rgba(99,102,241,0.25)] bg-dark-card/85'
            : isCollapsed
              ? 'border-white/[0.07] bg-dark-card/75 shadow-xs hover:border-white/[0.14] hover:bg-dark-card'
              : 'border-white/[0.07] bg-dark-card/75 shadow-xs hover:border-white/[0.12]'
        }`}
      >
        {/* Header Principal */}
        <div
          className={`${
            isCollapsed
              ? 'p-3 md:p-3.5 bg-dark-card/40 rounded-2xl'
              : 'p-4 md:p-5 border-b border-white/[0.06] bg-white/[0.01] rounded-t-2xl'
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
            onToggleFocusMode={() => setIsFocusModeOpen((prev) => !prev)}
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
            className={`rounded-b-2xl ${
              layout === 'sequential' && mode === 'practice'
                ? 'p-3 md:p-3.5 space-y-2.5'
                : 'p-5 md:p-6 space-y-5'
            }`}
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
              isFocusModeOpen ? (
                <div className="p-6 text-center text-dark-subtext border border-white/[0.06] rounded-2xl bg-white/[0.02] flex items-center justify-center gap-2">
                  <span className="text-xs">Modo Foco em execução na tela cheia...</span>
                </div>
              ) : (
                <QuizSequentialPlayer
                  questions={displayedQuestions}
                  onUpdateSingleQuestion={updateSingleQuestion}
                  onEvaluateOpenAnswer={handleEvaluateOpenAnswer}
                  evaluatingIds={evaluatingIds}
                  onDiscussInChat={handleDiscussInChat}
                  onSwitchToListLayout={() => props.updateAttributes({ layout: 'list' })}
                  activeIndex={sequentialActiveIndex}
                  onActiveIndexChange={setSequentialActiveIndex}
                />
              )
            ) : (
              <QuizPlayer
                questions={displayedQuestions}
                onUpdateSingleQuestion={updateSingleQuestion}
                onEvaluateOpenAnswer={handleEvaluateOpenAnswer}
                evaluatingIds={evaluatingIds}
                onDiscussInChat={handleDiscussInChat}
              />
            )}

            {/* Botão Voltar ao Topo da Bateria (Apenas no modo lista ou edição com múltiplas questões) */}
            {questions.length > 1 && layout !== 'sequential' && (
              <div className="flex justify-center pt-3 pb-1 border-t border-white/[0.05]">
                <button
                  onClick={handleScrollToTop}
                  className="flex items-center gap-1.5 text-xs text-dark-subtext hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] px-4 py-1.5 rounded-full transition-all duration-200 group shadow-xs"
                  title="Rolar suavemente até o topo desta bateria de questões"
                >
                  <ChevronUp size={14} className="group-hover:-translate-y-0.5 transition-transform text-white/70" />
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

      {/* Modal Modo Foco (Tela Cheia Sequencial) */}
      <QuizSequentialFocusModal
        isOpen={isFocusModeOpen}
        onClose={() => setIsFocusModeOpen(false)}
        title={title}
        questions={displayedQuestions}
        onUpdateSingleQuestion={updateSingleQuestion}
        onEvaluateOpenAnswer={handleEvaluateOpenAnswer}
        evaluatingIds={evaluatingIds}
        onDiscussInChat={handleDiscussInChat}
        onSwitchToListLayout={() => props.updateAttributes({ layout: 'list' })}
        activeIndex={sequentialActiveIndex}
        onActiveIndexChange={setSequentialActiveIndex}
        onDeleteQuestion={(id, idx) => {
          setIsFocusModeOpen(false);
          setDeletingQuestionInfo({ id, index: idx });
        }}
        onOpenAiAssistant={() => {
          setIsFocusModeOpen(false);
          setShowAiAssistantModal(true);
        }}
        onEditQuestion={() => {
          setIsFocusModeOpen(false);
          props.updateAttributes({ mode: 'edit' });
        }}
      />
    </NodeViewWrapper>
  );
}
