/**
 * Utilitários para localização e resolução de blocos de nível superior
 * e blocos arrastáveis a partir de coordenadas da tela.
 */

import type { EditorView } from '@tiptap/pm/view';
import type { Node as PMNode, ResolvedPos } from '@tiptap/pm/model';

export interface TopLevelBlock {
  pos: number;
  node: PMNode;
  dom: HTMLElement;
}

type PickBlock = ($pos: ResolvedPos) => number | null;

const pickTopLevel: PickBlock = ($pos) => ($pos.depth >= 1 ? $pos.before(1) : null);

const pickDraggable: PickBlock = ($pos) => {
  for (let depth = $pos.depth; depth >= 1; depth--) {
    if ($pos.node(depth - 1).type.name === 'columnBlock') return $pos.before(depth);
  }
  return pickTopLevel($pos);
};

function blockAt(view: EditorView, x: number, y: number, pick: PickBlock): TopLevelBlock | null {
  const doc = view.state.doc;

  const tryResolve = (raw: number): TopLevelBlock | null => {
    try {
      const $pos = doc.resolve(raw);
      const pos = pick($pos) ?? raw;
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
      // Posição inválida ignorada
    }
    return null;
  };

  // 1. Resolução via posAtCoords do ProseMirror
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

  // 2. Fallback via DOM elementFromPoint para NodeViews customizados
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
          // Erro de mapeamento DOM ignorado
        }
      }
    }
  }

  return null;
}

/** Retorna o bloco de nível superior (profundidade 1) sob a coordenada da tela. */
export function topLevelBlockAt(view: EditorView, x: number, y: number): TopLevelBlock | null {
  return blockAt(view, x, y, pickTopLevel);
}

/** Retorna o bloco arrastável sob a coordenada, resolvendo blocos internos de colunas se aplicável. */
export function draggableBlockAt(view: EditorView, x: number, y: number): TopLevelBlock | null {
  return blockAt(view, x, y, pickDraggable);
}
