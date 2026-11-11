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
      batteryId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-battery-id') || null,
        renderHTML: (attributes) => (attributes.batteryId ? { 'data-battery-id': attributes.batteryId } : {}),
      },
      cachedTitle: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-cached-title') || element.getAttribute('data-title') || '',
        renderHTML: (attributes) => ({ 'data-cached-title': attributes.cachedTitle || attributes.title || '' }),
      },
      cachedCount: {
        default: 0,
        parseHTML: (element) => parseInt(element.getAttribute('data-cached-count') || '0', 10),
        renderHTML: (attributes) => ({ 'data-cached-count': String(attributes.cachedCount || 0) }),
      },
      cachedTags: {
        default: [],
        parseHTML: (element) => {
          try {
            return JSON.parse(element.getAttribute('data-cached-tags') || '[]');
          } catch {
            return [];
          }
        },
        renderHTML: (attributes) => ({ 'data-cached-tags': JSON.stringify(attributes.cachedTags || []) }),
      },
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
        default: 'practice',
        parseHTML: (element) => (element.getAttribute('data-mode') === 'edit' ? 'edit' : 'practice'),
        renderHTML: (attributes) => ({ 'data-mode': attributes.mode || 'practice' }),
      },
      layout: {
        default: 'sequential',
        parseHTML: (element) => (element.getAttribute('data-layout') === 'list' ? 'list' : 'sequential'),
        renderHTML: (attributes) => ({ 'data-layout': attributes.layout || 'sequential' }),
      },
      questions: {
        default: [createDefaultQuestion(1)],
        parseHTML: (element) => {
          const raw = element.getAttribute('data-questions');
          return normalizeQuizQuestions(raw);
        },
        renderHTML: (attributes) => {
          if (attributes.batteryId) {
            return {};
          }
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
          if (attributes.batteryId) {
            return {};
          }
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
      stopEvent: ({ event }) => {
        const target = event?.target as HTMLElement;
        if (target?.closest?.('[data-drag-handle]')) return false;
        return true;
      },
    });
  },
});
