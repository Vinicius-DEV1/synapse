import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import QuestionBlockNodeView from './QuestionBlockNodeView';
import { createDefaultQuestion } from './utils/fireworks';
import { normalizeQuizQuestions, normalizeChatHistory } from './utils/quizNormalizer';

export const QuestionBlock = Node.create({
  name: 'questionBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      title: {
        default: 'Bateria de Exercícios',
        parseHTML: (element) => element.getAttribute('data-title') || 'Bateria de Exercícios',
        renderHTML: (attributes) => ({ 'data-title': attributes.title || 'Bateria de Exercícios' }),
      },
      description: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-description') || '',
        renderHTML: (attributes) => ({ 'data-description': attributes.description || '' }),
      },
      isCollapsed: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-collapsed') === 'true',
        renderHTML: (attributes) => ({ 'data-collapsed': attributes.isCollapsed ? 'true' : 'false' }),
      },
      mode: {
        default: 'edit',
        parseHTML: (element) => (element.getAttribute('data-mode') === 'practice' ? 'practice' : 'edit'),
        renderHTML: (attributes) => ({ 'data-mode': attributes.mode || 'edit' }),
      },
      questions: {
        default: [createDefaultQuestion(1)],
        parseHTML: (element) => {
          const raw = element.getAttribute('data-questions');
          return normalizeQuizQuestions(raw);
        },
        renderHTML: (attributes) => {
          try {
            return {
              'data-questions': encodeURIComponent(JSON.stringify(attributes.questions || [])),
            };
          } catch {
            return { 'data-questions': '[]' };
          }
        },
      },
      aiChatHistory: {
        default: [],
        parseHTML: (element) => {
          const raw = element.getAttribute('data-chat-history');
          return normalizeChatHistory(raw);
        },
        renderHTML: (attributes) => {
          try {
            return {
              'data-chat-history': encodeURIComponent(JSON.stringify(attributes.aiChatHistory || [])),
            };
          } catch {
            return { 'data-chat-history': '[]' };
          }
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="question-block"]',
      },
      {
        tag: 'div.question-block',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'question-block', class: 'question-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(QuestionBlockNodeView, {
      stopEvent: () => true,
    });
  },
});
