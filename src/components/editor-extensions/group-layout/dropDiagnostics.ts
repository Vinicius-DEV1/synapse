/**
 * dropDiagnostics.ts
 *
 * Drop diagnostics logger (disabled by default).
 *
 * Um arrasto pode nascer por três caminhos diferentes (alça flutuante, node view
 * com `data-drag-handle`, seleção de texto) e cada um preenche `view.dragging`
 * de um jeito. Quando um deles falha, o sintoma é intermitente e não há como
 * saber qual foi só olhando o resultado.
 *
 * Ligar no console do app:
 *     localStorage.setItem('caderno:debug-drop', '1')   // e recarregar
 *     localStorage.removeItem('caderno:debug-drop')     // desligar
 */

import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import type { Selection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';

const STORAGE_KEY = 'caderno:debug-drop';

function enabled(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false; // localStorage bloqueado (modo privado, sandbox)
  }
}

function describeSelection(selection: Selection): string {
  const kind =
    selection instanceof NodeSelection
      ? `NodeSelection(${selection.node.type.name})`
      : selection instanceof TextSelection
        ? `TextSelection${selection.empty ? '/vazia' : ''}`
        : selection.constructor.name;
  return `${kind} [${selection.from}..${selection.to}]`;
}

/** Quantos nodes de cada tipo o documento tem — para flagrar duplicação. */
function census(doc: PMNode): Record<string, number> {
  const counts: Record<string, number> = {};
  doc.descendants((node) => {
    if (node.isText) return true;
    counts[node.type.name] = (counts[node.type.name] ?? 0) + 1;
    return true;
  });
  return counts;
}

function diff(before: Record<string, number>, after: Record<string, number>): string {
  const names = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: string[] = [];
  for (const name of names) {
    const delta = (after[name] ?? 0) - (before[name] ?? 0);
    if (delta !== 0) changes.push(`${name} ${delta > 0 ? '+' : ''}${delta}`);
  }
  return changes.length > 0 ? changes.join(', ') : 'nenhuma mudança de contagem';
}

export interface DropDiagnostic {
  /** Como o arrasto foi aberto, segundo o que há em `view.dragging`. */
  origem: 'dragging.node' | 'seleção do documento' | 'sem dragging (externo)';
  moved: boolean;
  selecaoUsada: Selection;
  alvo: { pos: number; typeName: string; mode: string; side: string } | null;
  conteudo: PMNode[];
}

/**
 * Registra o drop e devolve uma função para ser chamada DEPOIS da aplicação,
 * que compara a contagem de nodes. Duplicação aparece como um `+1` onde
 * deveria haver `0`.
 */
export function traceDrop(view: EditorView, info: DropDiagnostic): (aplicado: boolean) => void {
  if (!enabled()) return () => {};

  const before = census(view.state.doc);

  console.groupCollapsed(
    `%c[drop] origem=${info.origem} moved=${info.moved}`,
    'color:#8b5cf6;font-weight:bold'
  );
  console.log('seleção usada para remover:', describeSelection(info.selecaoUsada));
  console.log('seleção do documento     :', describeSelection(view.state.selection));
  console.log('view.dragging.node       :', info.origem === 'dragging.node' ? 'presente' : 'AUSENTE');
  console.log('alvo                     :', info.alvo ?? 'nenhum (drop normal do ProseMirror)');
  console.log('conteúdo solto           :', info.conteudo.map((n) => n.type.name).join(', ') || '(vazio)');

  return (aplicado: boolean) => {
    const after = census(view.state.doc);
    console.log('agrupamento aplicado     :', aplicado);
    console.log('%cbalanço de nodes        : ' + diff(before, after), 'color:#22c55e');
    if (!aplicado) console.log('→ drop devolvido ao ProseMirror');
    console.groupEnd();
  };
}
