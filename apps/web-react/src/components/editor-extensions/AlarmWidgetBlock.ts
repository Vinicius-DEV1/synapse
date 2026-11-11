import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import AlarmWidgetNodeView from './AlarmWidgetNodeView';

export interface AlarmWidgetOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    alarmWidget: {
      insertAlarmWidget: (options: { alarmId: string, timeStr: string, label: string }) => ReturnType;
    }
  }
}

export const AlarmWidgetBlock = Node.create<AlarmWidgetOptions>({
  name: 'alarmWidget',
  group: 'inline',
  inline: true,
  atom: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'alarm-widget',
      },
    }
  },

  addAttributes() {
    return {
      alarmId: {
        default: null,
        parseHTML: element => element.getAttribute('data-alarm-id'),
        renderHTML: attributes => ({ 'data-alarm-id': attributes.alarmId }),
      },
      timeStr: {
        default: '',
        parseHTML: element => element.getAttribute('data-time'),
        renderHTML: attributes => ({ 'data-time': attributes.timeStr }),
      },
      label: {
        default: '',
        parseHTML: element => element.getAttribute('data-label'),
        renderHTML: attributes => ({ 'data-label': attributes.label }),
      },
      status: {
        default: 'running', // 'running', 'completed', 'cancelled'
        parseHTML: element => element.getAttribute('data-status') || 'running',
        renderHTML: attributes => ({ 'data-status': attributes.status }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="alarm-widget"]',
      },
      {
        tag: 'span.alarm-widget',
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'alarm-widget' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(AlarmWidgetNodeView)
  },

  addCommands() {
    return {
      insertAlarmWidget: (options) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            alarmId: options.alarmId,
            timeStr: options.timeStr,
            label: options.label,
            status: 'pending'
          },
        });
      },
    }
  },
});
