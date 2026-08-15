/**
 * ImageKeymap.ts
 *
 * Atalhos de teclado para blocos de imagem.
 *
 * Antes, Backspace/Delete perto de uma imagem era interceptado no Editor.tsx e
 * abria um modal de confirmação — inclusive quando o cursor só estava ao lado
 * da imagem, o que tornava impossível apagar texto normalmente.
 *
 * Comportamento novo (padrão de editores como Notion/Google Docs):
 *   • cursor encostado numa imagem  → a primeira tecla SELECIONA a imagem
 *   • imagem selecionada            → a segunda tecla apaga (desfazível com Ctrl+Z)
 *   • Alt+↑ / Alt+↓                 → move a imagem um bloco acima/abaixo
 *   • Enter                         → cria um parágrafo depois da imagem
 */

import { Extension } from '@tiptap/core';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import { getSelectedImage, isImageNode, moveBlockNode } from './imageUtils';

export const ImageKeymap = Extension.create({
  name: 'imageKeymap',

  // Precisa rodar antes dos atalhos padrão do StarterKit.
  priority: 1000,

  addKeyboardShortcuts() {
    const moveSelected = (direction: -1 | 1) => () => {
      const selected = getSelectedImage(this.editor.state);
      if (!selected) return false;
      return moveBlockNode(this.editor, selected.pos, direction);
    };

    const removeOrSelect = (key: 'Backspace' | 'Delete') => () => {
      const { state, dispatch } = this.editor.view;
      const { selection } = state;

      // 1) Imagem já selecionada → abre o modal de confirmação de exclusão.
      const selected = getSelectedImage(state);
      if (selected) {
        window.dispatchEvent(
          new CustomEvent('request-image-delete', {
            detail: { pos: selected.pos, node: selected.node },
          })
        );
        return true;
      }

      // 2) Cursor colado numa imagem → seleciona em vez de apagar às cegas.
      if (!selection.empty) return false;

      const $from = selection.$from;
      const atEdge = key === 'Backspace' ? $from.parentOffset === 0 : $from.parentOffset === $from.parent.content.size;

      let targetPos: number | null = null;
      if (key === 'Backspace') {
        const before = $from.nodeBefore;
        if (before && isImageNode(before)) {
          targetPos = $from.pos - before.nodeSize;
        } else if (atEdge && $from.depth > 0) {
          const outer = state.doc.resolve($from.before($from.depth)).nodeBefore;
          if (outer && isImageNode(outer)) targetPos = $from.before($from.depth) - outer.nodeSize;
        }
      } else {
        const after = $from.nodeAfter;
        if (after && isImageNode(after)) {
          targetPos = $from.pos;
        } else if (atEdge && $from.depth > 0) {
          const outerPos = $from.after($from.depth);
          const outer = state.doc.resolve(outerPos).nodeAfter;
          if (outer && isImageNode(outer)) targetPos = outerPos;
        }
      }

      if (targetPos === null) return false;

      try {
        dispatch(state.tr.setSelection(NodeSelection.create(state.doc, targetPos)).scrollIntoView());
      } catch {
        return false;
      }
      return true;
    };

    return {
      'Alt-ArrowUp': moveSelected(-1),
      'Alt-ArrowDown': moveSelected(1),
      Backspace: removeOrSelect('Backspace'),
      Delete: removeOrSelect('Delete'),
      Enter: () => {
        const selected = getSelectedImage(this.editor.state);
        if (!selected) return false;

        const { state, dispatch } = this.editor.view;
        const paragraph = state.schema.nodes.paragraph;
        if (!paragraph) return false;

        const insertAt = selected.pos + selected.node.nodeSize;
        const tr = state.tr.insert(insertAt, paragraph.create());
        tr.setSelection(TextSelection.near(tr.doc.resolve(insertAt + 1)));
        dispatch(tr.scrollIntoView());
        return true;
      },
    };
  },
});
