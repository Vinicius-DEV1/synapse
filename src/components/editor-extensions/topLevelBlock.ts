/**
 * topLevelBlock.ts
 *
 * Localiza o bloco de nível superior sob um ponto da tela — a pergunta "que
 * bloco está debaixo do cursor?", que tanto o arrasto quanto a alça precisam
 * fazer.
 */

import type { EditorView } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';

export interface TopLevelBlock {
  pos: number;
  node: PMNode;
  dom: HTMLElement;
}

export function topLevelBlockAt(view: EditorView, x: number, y: number): TopLevelBlock | null {
  const doc = view.state.doc;

  const tryResolve = (raw: number): TopLevelBlock | null => {
    try {
      const $pos = doc.resolve(raw);
      const pos = $pos.depth >= 1 ? $pos.before(1) : raw;
      if (pos >= 0 && pos < doc.content.size) {
        const node = doc.nodeAt(pos);
        if (node) {
          const dom = view.nodeDOM(pos);
          if (dom instanceof HTMLElement) {
            return { pos, node, dom };
          }
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  };

  // 1. Tenta posAtCoords do ProseMirror
  const coords = view.posAtCoords({ left: x, top: y });
  if (coords) {
    if (typeof coords.inside === 'number' && coords.inside >= 0) {
      const found = tryResolve(coords.inside);
      if (found) return found;
    }
    if (typeof coords.pos === 'number' && coords.pos >= 0) {
      const found = tryResolve(coords.pos);
      if (found) return found;
    }
  }

  // 2. Fallback via DOM elementFromPoint (garante localização precisa sobre NodeViews)
  const el = document.elementFromPoint(x, y);
  if (el) {
    const editorDom = view.dom;
    if (editorDom.contains(el)) {
      let current: HTMLElement | null = el as HTMLElement;
      while (current && current.parentElement && current.parentElement !== editorDom) {
        current = current.parentElement;
      }
      if (current && current.parentElement === editorDom) {
        try {
          const domPos = view.posAtDOM(current, 0);
          if (typeof domPos === 'number' && domPos >= 0) {
            return tryResolve(domPos);
          }
        } catch {
          /* ignore */
        }
      }
    }
  }

  return null;
}
