import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { HabitWidgetBlock } from './HabitWidgetBlock';

describe('HabitWidgetBlock TipTap Extension', () => {
  it('creates schema with habitWidget node', () => {
    const editor = new Editor({
      extensions: [StarterKit, HabitWidgetBlock],
      content:
        '<p>Tarefa diária: <span data-type="habit-widget" data-habit-id="habit-123" data-title="Ler inglês" data-streak="5"></span></p>',
    });

    expect(editor.schema.nodes.habitWidget).toBeDefined();
    expect(editor.getHTML()).toContain('data-habit-id="habit-123"');
    expect(editor.getHTML()).toContain('data-title="Ler inglês"');
    editor.destroy();
  });

  it('inserts habit widget via insertHabitWidget command', () => {
    const editor = new Editor({
      extensions: [StarterKit, HabitWidgetBlock],
      content: '<p>Começo do texto </p>',
    });

    editor.commands.insertHabitWidget({
      habitId: 'habit-abc',
      title: 'Meditar',
      targetDate: '2026-09-25',
      streak: 3,
    });

    const html = editor.getHTML();
    expect(html).toContain('data-habit-id="habit-abc"');
    expect(html).toContain('data-target-date="2026-09-25"');
    expect(html).toContain('data-title="Meditar"');
    editor.destroy();
  });
});
