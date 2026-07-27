import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import CalendarEventWidgetNodeView from './CalendarEventWidgetNodeView';
import { Plugin, PluginKey, NodeSelection } from '@tiptap/pm/state';

export interface CalendarEventWidgetOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    calendarEventWidget: {
      insertCalendarEventWidget: (options: {
        eventId: string;
        title: string;
        dateStr: string;
        pageId?: string | null;
        status?: string;
      }) => ReturnType;
    };
  }
}

export const CalendarEventWidgetBlock = Node.create<CalendarEventWidgetOptions>({
  name: 'calendarEventWidget',
  group: 'inline',
  inline: true,
  atom: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'calendar-event-widget',
      },
    };
  },

  addAttributes() {
    return {
      eventId: {
        default: null,
        parseHTML: element => element.getAttribute('data-event-id'),
        renderHTML: attributes => ({ 'data-event-id': attributes.eventId }),
      },
      title: {
        default: 'Novo Evento',
        parseHTML: element => element.getAttribute('data-title'),
        renderHTML: attributes => ({ 'data-title': attributes.title }),
      },
      dateStr: {
        default: '',
        parseHTML: element => element.getAttribute('data-date'),
        renderHTML: attributes => ({ 'data-date': attributes.dateStr }),
      },
      pageId: {
        default: null,
        parseHTML: element => element.getAttribute('data-page-id'),
        renderHTML: attributes => ({ 'data-page-id': attributes.pageId }),
      },
      status: {
        default: 'pending',
        parseHTML: element => element.getAttribute('data-status') || 'pending',
        renderHTML: attributes => ({ 'data-status': attributes.status }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="calendar-event-widget"]',
      },
      {
        tag: 'span.calendar-event-widget',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'calendar-event-widget',
      }),
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('calendarEventWidgetBackspaceHandler'),
        props: {
          handleKeyDown(view, event) {
            const { state } = view;
            const { selection } = state;

            if (event.key === 'Backspace' || event.key === 'Delete') {
              // 1. Se o widget já estiver selecionado (NodeSelection), intercepta e abre a confirmação
              if (
                selection instanceof NodeSelection &&
                selection.node.type.name === 'calendarEventWidget'
              ) {
                const nodeDOM = view.nodeDOM(selection.from);
                if (nodeDOM instanceof HTMLElement) {
                  const eventWidget = nodeDOM.querySelector('[contenteditable="false"]');
                  if (eventWidget) {
                    const customEv = new CustomEvent('trigger-widget-delete-confirm');
                    eventWidget.dispatchEvent(customEv);
                    return true; // previne deleção direta pelo Prosemirror
                  }
                }
              }

              // 2. Se for uma seleção normal e o cursor estiver logo antes ou depois do widget
              if (selection.empty) {
                const { $anchor } = selection;
                if (event.key === 'Backspace') {
                  const nodeBefore = $anchor.nodeBefore;
                  if (nodeBefore && nodeBefore.type.name === 'calendarEventWidget') {
                    // Seleciona o widget em vez de apagá-lo instantaneamente
                    const tr = state.tr.setSelection(NodeSelection.create(state.doc, $anchor.pos - nodeBefore.nodeSize));
                    view.dispatch(tr);
                    return true;
                  }
                } else if (event.key === 'Delete') {
                  const nodeAfter = $anchor.nodeAfter;
                  if (nodeAfter && nodeAfter.type.name === 'calendarEventWidget') {
                    // Seleciona o widget em vez de apagá-lo instantaneamente
                    const tr = state.tr.setSelection(NodeSelection.create(state.doc, $anchor.pos));
                    view.dispatch(tr);
                    return true;
                  }
                }
              }
            }
            return false;
          },
        },
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalendarEventWidgetNodeView);
  },

  addCommands() {
    return {
      insertCalendarEventWidget:
        options =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              eventId: options.eventId,
              title: options.title,
              dateStr: options.dateStr,
              pageId: options.pageId || null,
              status: options.status || 'pending',
            },
          });
        },
    };
  },
});
