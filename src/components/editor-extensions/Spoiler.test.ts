import { describe, it, expect } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import { Editor } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { Spoiler } from './Spoiler';

describe('Spoiler TipTap Extension', () => {
  it('creates schema with spoiler mark', () => {
    const editor = new Editor({
      extensions: [
        StarterKit,
        Spoiler,
      ],
      content: '<p>Texto com <span data-type="spoiler" class="caderno-spoiler">fumaça secreta</span> revelada.</p>',
    });

    expect(editor.schema.marks.spoiler).toBeDefined();
    expect(editor.getHTML()).toContain('data-type="spoiler"');
    editor.destroy();
  });

  it('toggles spoiler mark on text selection', () => {
    const editor = new Editor({
      extensions: [
        StarterKit,
        Spoiler,
      ],
      content: '<p>Segredo importante</p>',
    });

    // Select "Segredo"
    editor.commands.setTextSelection({ from: 1, to: 8 });
    expect(editor.isActive('spoiler')).toBe(false);

    // Toggle spoiler ON
    editor.commands.toggleSpoiler();
    expect(editor.isActive('spoiler')).toBe(true);
    expect(editor.getHTML()).toContain('data-type="spoiler"');

    // Toggle spoiler OFF
    editor.commands.toggleSpoiler();
    expect(editor.isActive('spoiler')).toBe(false);

    editor.destroy();
  });
});
