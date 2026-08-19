/**
 * topLevelBlock.ts
 *
 * Localiza o bloco sob um ponto da tela — a pergunta "que bloco está debaixo do
 * cursor?", que tanto o arrasto quanto a alça precisam fazer.
 *
 * São duas perguntas parecidas e não iguais, uma função para cada:
 *
 *   • `topLevelBlockAt` — o bloco de NÍVEL SUPERIOR. É o alvo de um agrupamento:
 *     só um bloco de topo pode virar coluna de um grupo novo.
 *
 *   • `draggableBlockAt` — o bloco que a ALÇA pega, que desce até dentro de uma
 *     coluna. Sem essa distinção, parar o cursor sobre um parágrafo de dentro de
 *     uma coluna dava a alça do GRUPO INTEIRO: arrastá-la levava o grupo junto,
 *     e tirar um bloco de uma coluna arrastando era impossível.
 */

import type { EditorView } from '@tiptap/pm/view';
import type { Node as PMNode, ResolvedPos } from '@tiptap/pm/model';

export interface TopLevelBlock {
  pos: number;
  node: PMNode;
  dom: HTMLElement;
}

/** Escolhe, dentro da árvore de ancestrais do ponto, a posição do bloco desejado. */
type PickBlock = ($pos: ResolvedPos) => number | null;

const pickTopLevel: PickBlock = ($pos) => ($pos.depth >= 1 ? $pos.before(1) : null);

/**
 * De dentro para fora, o primeiro nível cujo PAI é uma coluna; se o ponto não
 * está dentro de nenhuma, o bloco de nível superior.
 */
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

/** O bloco de nível superior sob o ponto — o alvo de um agrupamento. */
export function topLevelBlockAt(view: EditorView, x: number, y: number): TopLevelBlock | null {
  return blockAt(view, x, y, pickTopLevel);
}

/** O bloco que a alça flutuante deve pegar, descendo para dentro de colunas. */
export function draggableBlockAt(view: EditorView, x: number, y: number): TopLevelBlock | null {
  return blockAt(view, x, y, pickDraggable);
}
