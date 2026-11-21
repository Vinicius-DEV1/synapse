import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight } from 'lowlight';
import { loadLanguageGrammar } from '../../../utils/syntax-highlighter';
import {
  createLazyLowlightPlugin,
  LOWLIGHT_LANGUAGE_LOADED_META,
} from './lazyLowlightPlugin';

function createEditorWithLazyLowlight(content: string) {
  const lowlight = createLowlight();
  const LazyCodeBlock = CodeBlockLowlight.extend({
    addProseMirrorPlugins() {
      const parentPlugins = (typeof this.parent === 'function' ? this.parent() : []).filter(
        (plugin) => {
          const pluginKey = plugin.spec.key as { key?: string } | undefined;
          return !pluginKey?.key?.startsWith('lowlight');
        }
      );
      return [
        ...parentPlugins,
        createLazyLowlightPlugin({
          name: this.name,
          lowlight: this.options.lowlight,
          defaultLanguage: this.options.defaultLanguage,
        }),
      ];
    },
  }).configure({ lowlight });

  const editor = new Editor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      LazyCodeBlock,
    ],
    content,
  });

  return { editor, lowlight };
}

describe('createLazyLowlightPlugin (ProseMirror async grammar decoration refresh)', () => {
  it('applies syntax highlight decorations when grammar loads asynchronously via non-docChanged meta transaction', async () => {
    const { editor, lowlight } = createEditorWithLazyLowlight(
      '<pre><code class="language-typescript">const answer: number = 42;</code></pre>'
    );

    try {
      // Initially empty registry -> no highlight spans rendered
      expect(editor.view.dom.querySelectorAll('.hljs-keyword').length).toBe(0);

      // Dynamically load and register typescript grammar, then dispatch meta-only tx
      const loaded = await loadLanguageGrammar('typescript');
      expect(loaded).not.toBeNull();
      lowlight.register(loaded!.name, loaded!.grammar);

      const tr = editor.state.tr.setMeta(LOWLIGHT_LANGUAGE_LOADED_META, 'typescript');
      expect(tr.docChanged).toBe(false);
      editor.view.dispatch(tr);

      // Decorations MUST now be applied even though docChanged was false
      const keywords = Array.from(editor.view.dom.querySelectorAll('.hljs-keyword')).map(
        (el) => el.textContent
      );
      expect(keywords).toContain('const');
      expect(editor.view.dom.querySelectorAll('.hljs-number').length).toBeGreaterThan(0);
    } finally {
      editor.destroy();
    }
  });

  it('recomputes decorations when codeBlock language attribute changes via setNodeMarkup while cursor is outside', async () => {
    const { editor, lowlight } = createEditorWithLazyLowlight(
      '<p>Intro paragraph</p><pre><code>def greet():\n    return 1</code></pre>'
    );

    try {
      const py = await loadLanguageGrammar('python');
      expect(py).not.toBeNull();
      lowlight.register(py!.name, py!.grammar);

      // Place cursor in paragraph outside the code block
      editor.commands.setTextSelection(2);
      expect(editor.isActive('codeBlock')).toBe(false);

      // Find codeBlock pos and update its language attribute via setNodeMarkup (AttrStep)
      let codeBlockPos = -1;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'codeBlock') {
          codeBlockPos = pos;
          return false;
        }
        return true;
      });
      expect(codeBlockPos).toBeGreaterThan(0);

      editor.view.dispatch(
        editor.state.tr.setNodeMarkup(codeBlockPos, undefined, { language: 'python' })
      );

      const keywords = Array.from(editor.view.dom.querySelectorAll('.hljs-keyword')).map(
        (el) => el.textContent
      );
      expect(keywords).toContain('def');
      expect(keywords).toContain('return');
    } finally {
      editor.destroy();
    }
  });
});
