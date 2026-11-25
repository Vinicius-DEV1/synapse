import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { BlockquoteToggle } from './BlockquoteToggle';
import { ToggleBlock } from './ToggleBlock';
import { CollectionBlock } from './CollectionBlock';
import { canonicalizeNoteHtmlForPersistence } from '../notes/utils/canonicalNoteHtml';

describe('Cross-Client Caderno HTML Compatibility (Web React <-> Desktop Qt)', () => {
  it('preserves title, color, and open state on BlockquoteToggle and ToggleBlock across getHTML and setContent', () => {
    const editor = new Editor({
      extensions: [StarterKit, BlockquoteToggle, ToggleBlock, CollectionBlock],
      content: `
        <div class="blockquote-toggle" data-type="blockquote-toggle" data-title="Resumo de Arquitetura" data-color="#8b5cf6" data-is-open="true">
          <p>Conteúdo <strong>importante</strong> dentro do callout.</p>
        </div>
        <div class="toggle-block" data-type="toggle-block" data-title="Detalhes Extras" data-is-open="false">
          <p>Item oculto</p>
        </div>
        <div class="group-collection" data-type="groupBlock" data-title="Módulo 1" data-collapsed="true">
          <p>Notas agrupadas</p>
        </div>
      `,
    });

    const serialized = canonicalizeNoteHtmlForPersistence(editor.getHTML());
    expect(serialized).toContain('data-title="Resumo de Arquitetura"');
    expect(serialized).toContain('data-color="#8b5cf6"');
    expect(serialized).toContain('data-is-open="true"');
    expect(serialized).toContain('data-title="Detalhes Extras"');
    expect(serialized).toContain('data-is-open="false"');
    expect(serialized).toContain('data-title="Módulo 1"');
    expect(serialized).toContain('data-collapsed="true"');

    // Reload serialized HTML into a fresh editor (simulating external edit from Desktop Qt)
    const reloaded = new Editor({
      extensions: [StarterKit, BlockquoteToggle, ToggleBlock, CollectionBlock],
      content: serialized,
    });
    const json = reloaded.getJSON();
    expect(json.content?.[0]?.attrs?.title).toBe('Resumo de Arquitetura');
    expect(json.content?.[0]?.attrs?.color).toBe('#8b5cf6');
    expect(json.content?.[0]?.attrs?.isOpen).toBe(true);
    expect(json.content?.[1]?.attrs?.title).toBe('Detalhes Extras');
    expect(json.content?.[1]?.attrs?.isOpen).toBe(false);
    expect(json.content?.[2]?.attrs?.title).toBe('Módulo 1');
    expect(json.content?.[2]?.attrs?.collapsed).toBe(true);

    editor.destroy();
    reloaded.destroy();
  });

  it('canonicalizes HTML5 boolean checked attributes for strict XML native readers', () => {
    const editor = new Editor({
      extensions: [StarterKit, TaskList, TaskItem.configure({ nested: true })],
      content:
        '<ul data-type="taskList"><li data-checked="true" data-type="taskItem"><label><input type="checkbox" checked="checked"/><span></span></label><div><p>Concluído</p></div></li></ul>',
    });

    const canonical = canonicalizeNoteHtmlForPersistence(editor.getHTML());
    expect(canonical).toContain('checked="checked"');
    editor.destroy();
  });
});
