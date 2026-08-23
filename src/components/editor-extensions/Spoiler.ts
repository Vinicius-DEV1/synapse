import { Mark, mergeAttributes } from '@tiptap/core';

export interface SpoilerOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    spoiler: {
      /**
       * Set a spoiler mark on current selection
       */
      setSpoiler: () => ReturnType;
      /**
       * Toggle a spoiler mark on current selection
       */
      toggleSpoiler: () => ReturnType;
      /**
       * Unset a spoiler mark on current selection
       */
      unsetSpoiler: () => ReturnType;
    };
  }
}

export const Spoiler = Mark.create<SpoilerOptions>({
  name: 'spoiler',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="spoiler"]',
      },
      {
        tag: 'span.caderno-spoiler',
      },
      {
        tag: 'span.telegram-spoiler',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'spoiler',
        class: 'caderno-spoiler',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setSpoiler:
        () =>
        ({ commands }) => {
          return commands.setMark(this.name);
        },
      toggleSpoiler:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
      unsetSpoiler:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-s': () => this.editor.commands.toggleSpoiler(),
    };
  },
});

export default Spoiler;
