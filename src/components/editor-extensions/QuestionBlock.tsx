import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

const QuestionBlockComponent = (props: any) => {
  const { question, options, correctIndex, answered, selectedIndex } = props.node.attrs;

  const handleQuestionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    props.updateAttributes({ question: e.target.value });
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    props.updateAttributes({ options: newOptions });
  };

  const handleCorrectIndexChange = (index: number) => {
    props.updateAttributes({ correctIndex: index });
  };

  const handleSelectOption = (index: number) => {
    if (answered) return;
    props.updateAttributes({ selectedIndex: index });
  };

  const handleAnswer = () => {
    props.updateAttributes({ answered: true });
  };

  const handleDelete = () => {
    props.deleteNode();
  };

  return (
    <NodeViewWrapper className="question-block relative bg-dark-card border border-white/10 rounded-xl p-4 my-6 shadow-md block">
      <button 
        onClick={handleDelete}
        className="absolute top-3 right-3 p-1.5 text-dark-subtext hover:text-red-400 hover:bg-white/10 rounded-md transition-colors"
        title="Deletar Questão"
      >
        <Trash2 size={18} />
      </button>

      <textarea
        value={question}
        onChange={handleQuestionChange}
        placeholder="Escreva sua pergunta aqui..."
        className="w-full bg-transparent text-lg font-bold text-brand-100 placeholder-white/30 resize-none outline-none mb-4 pr-8"
        rows={2}
      />

      <div className="flex flex-col gap-2 mb-4">
        {options.map((opt: string, idx: number) => (
          <div key={idx} className="flex items-center gap-3">
            <input 
              type="radio" 
              checked={selectedIndex === idx}
              onChange={() => handleSelectOption(idx)}
              disabled={answered}
              className="w-4 h-4 text-brand-500 focus:ring-brand-500 border-white/20 bg-dark-bg cursor-pointer"
            />
            <input
              type="text"
              value={opt}
              onChange={(e) => handleOptionChange(idx, e.target.value)}
              placeholder={`Opção ${String.fromCharCode(65 + idx)}`}
              className={`flex-1 bg-transparent outline-none transition-colors px-2 py-1 rounded ${
                answered && idx === correctIndex 
                  ? 'text-green-400 font-bold bg-green-500/10' 
                  : answered && idx === selectedIndex && idx !== correctIndex
                  ? 'text-red-400 line-through bg-red-500/10'
                  : 'text-dark-text focus:bg-white/5'
              }`}
            />
            {/* Botão para definir qual é a correta (só aparece antes de responder) */}
            {!answered && (
              <button 
                onClick={() => handleCorrectIndexChange(idx)}
                className={`text-xs px-2 py-1 rounded ${correctIndex === idx ? 'bg-green-500/20 text-green-400' : 'text-dark-subtext hover:bg-white/10'}`}
                title="Marcar como alternativa correta"
              >
                {correctIndex === idx ? 'Correta' : 'Marcar Correta'}
              </button>
            )}
          </div>
        ))}
      </div>

      <button 
        onClick={handleAnswer}
        disabled={answered || selectedIndex === null}
        className="w-full py-2 bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {answered ? 'Respondida' : 'Responder'}
      </button>
    </NodeViewWrapper>
  );
};

export const QuestionBlock = Node.create({
  name: 'questionBlock',
  group: 'block',
  atom: true, // É um bloco atômico (não tem filhos prosemirror)

  addAttributes() {
    return {
      question: { default: '' },
      options: { default: ['', '', '', ''] },
      correctIndex: { default: 0 },
      answered: { default: false },
      selectedIndex: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div.question-block' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'question-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(QuestionBlockComponent);
  },
});
