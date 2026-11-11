import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import HabitWidgetNodeView from './HabitWidgetNodeView';

export interface HabitWidgetOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    habitWidget: {
      insertHabitWidget: (options: {
        habitId: string;
        targetDate?: string | null;
        title?: string;
        color?: string;
        streak?: number;
      }) => ReturnType;
    };
  }
}

export const HabitWidgetBlock = Node.create<HabitWidgetOptions>({
  name: 'habitWidget',
  group: 'inline',
  inline: true,
  atom: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'habit-widget',
      },
    };
  },

  addAttributes() {
    return {
      habitId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-habit-id'),
        renderHTML: (attributes) => {
          if (!attributes.habitId) return {};
          return { 'data-habit-id': attributes.habitId };
        },
      },
      targetDate: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-target-date'),
        renderHTML: (attributes) => {
          if (!attributes.targetDate) return {};
          return { 'data-target-date': attributes.targetDate };
        },
      },
      title: {
        default: 'Hábito',
        parseHTML: (element) => element.getAttribute('data-title') || 'Hábito',
        renderHTML: (attributes) => ({ 'data-title': attributes.title || 'Hábito' }),
      },
      color: {
        default: 'emerald',
        parseHTML: (element) => element.getAttribute('data-color') || 'emerald',
        renderHTML: (attributes) => ({ 'data-color': attributes.color || 'emerald' }),
      },
      streak: {
        default: 0,
        parseHTML: (element) => Number(element.getAttribute('data-streak')) || 0,
        renderHTML: (attributes) => ({ 'data-streak': String(attributes.streak || 0) }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="habit-widget"]',
      },
      {
        tag: 'span.habit-widget',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'habit-widget' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(HabitWidgetNodeView);
  },

  addCommands() {
    return {
      insertHabitWidget:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              habitId: options.habitId,
              targetDate: options.targetDate || null,
              title: options.title || 'Hábito',
              color: options.color || 'emerald',
              streak: options.streak || 0,
            },
          });
        },
    };
  },
});

export default HabitWidgetBlock;
