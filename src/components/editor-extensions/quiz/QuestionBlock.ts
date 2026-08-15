import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import QuestionBlockNodeView from './QuestionBlockNodeView';
import { createDefaultQuestion } from './utils/fireworks';

export const QuestionBlock = Node.create({
  name: 'questionBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      title: { default: 'Bateria de Exercícios' },
      description: { default: '' },
      isCollapsed: { default: false },
      mode: { default: 'edit' },
      questions: {
        default: [createDefaultQuestion(1)],
      },
      aiChatHistory: { default: [] },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.question-block',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'question-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(QuestionBlockNodeView);
  },
});
