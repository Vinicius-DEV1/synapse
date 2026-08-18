/**
 * groupAutoCollapse.ts
 *
 * Faz o layout se desmontar sozinho quando deixa de fazer sentido.
 *
 * `columnBlock` é `block+`: ao arrastar o único bloco de uma coluna para fora, o
 * ProseMirror recoloca um parágrafo vazio para manter o documento válido, e a
 * coluna morta continua ocupando espaço. Apagá-la à mão também não resolve — o
 * schema a recria na mesma transação.
 *
 * A heurística: colapsa se o filho está vazio E a seleção NÃO está dentro do
 * grupo. É isso que separa os dois casos, porque ao arrastar o conteúdo para
 * fora o cursor o acompanha e termina fora do grupo, enquanto quem apagou o
 * texto para redigitar deixa o cursor exatamente ali dentro.
 *
 * Como a UI nunca cria uma coluna vazia (os dois caminhos de criação exigem
 * conteúdo), "vazio" só pode ter vindo de uma remoção — o que também limpa, na
 * primeira edição, documentos que já ficaram com colunas mortas.
 *
 * Rede de segurança à parte: qualquer grupo que fique com menos de dois filhos
 * é desfeito. Esse caso é inequívoco.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import type { Node as PMNode } from '@tiptap/pm/model';
import { ySyncPluginKey } from 'y-prosemirror';
import { getSpecForGroup } from './groupSpecs';
import type { GroupSpec } from './groupSpecs';
import { getChildren, pruneGroupsInTransaction, writeGroupRemainderInTr } from './groupCommands';

/** Quantas vezes o colapso pode reentrar, para não haver laço infinito. */
const AUTO_COLLAPSE_META = 'groupLayout:autoCollapse';
const MAX_CASCADE = 3;

interface EmptyChildTarget {
  spec: GroupSpec;
  groupPos: number;
  groupNode: PMNode;
  indices: number[];
}

/** Filhos vazios cuja remoção é segura (seleção fora do grupo). */
function findCollapsibleChildren(state: EditorState): EmptyChildTarget[] {
  const targets: EmptyChildTarget[] = [];

  // `descendants` e não `forEach`: o schema permite um grupo dentro de uma
  // coluna, e uma coluna vazia lá dentro também precisa colapsar.
  state.doc.descendants((node, pos) => {
    const spec = getSpecForGroup(node);
    if (!spec) return true;

    // A seleção só protege grupos cujos filhos são editados no lugar — ver
    // `editableChildren`. Um card de link em branco é lixo do schema e sai já.
    const selectionInside =
      state.selection.from >= pos && state.selection.to <= pos + node.nodeSize;
    if (spec.editableChildren && selectionInside) return true;

    const indices: number[] = [];
    getChildren(node).forEach((child, index) => {
      if (spec.isEmptyChild(child)) indices.push(index);
    });

    if (indices.length > 0) {
      targets.push({ spec, groupPos: pos, groupNode: node, indices });
    }
    return true;
  });

  return targets;
}

function removeChildrenInTransaction(tr: Transaction, target: EmptyChildTarget): boolean {
  const { spec, groupPos, groupNode, indices } = target;
  const drop = new Set(indices);
  const remaining = getChildren(groupNode).filter((_, index) => !drop.has(index));

  // As DUAS pontas são remapeadas: calcular o fim como `início + nodeSize`
  // usaria o tamanho de antes da transação e erraria a faixa quando houvesse
  // mais de um grupo afetado.
  const range = {
    from: tr.mapping.map(groupPos, -1),
    to: tr.mapping.map(groupPos + groupNode.nodeSize, 1),
  };

  try {
    writeGroupRemainderInTr(tr, spec, groupNode, range, remaining);
  } catch (err) {
    console.warn('[group-layout] Falha ao colapsar coluna vazia:', err);
    return false;
  }

  return true;
}

export const GroupAutoCollapse = Extension.create({
  name: 'groupAutoCollapse',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('groupAutoCollapse'),

        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((tr) => tr.docChanged)) return null;

          /*
           * Edições vindas de outro cliente pelo Yjs não passam por aqui: a
           * heurística pergunta "a seleção está dentro do grupo?", e numa edição
           * remota a seleção LOCAL está sempre em outro lugar. Sem esta guarda,
           * este cliente colapsaria a coluna que o outro acabou de criar e
           * propagaria a remoção de volta.
           */
          if (transactions.some((tr) => tr.getMeta(ySyncPluginKey)?.isChangeOrigin)) {
            return null;
          }

          const depth = transactions.reduce(
            (max, tr) => Math.max(max, Number(tr.getMeta(AUTO_COLLAPSE_META)) || 0),
            0
          );
          if (depth >= MAX_CASCADE) return null;

          const tr = newState.tr;
          tr.setMeta(AUTO_COLLAPSE_META, depth + 1);

          // De trás para frente: as posições anteriores continuam válidas.
          const targets = findCollapsibleChildren(newState).reverse();
          let changed = false;
          for (const target of targets) {
            if (removeChildrenInTransaction(tr, target)) changed = true;
          }

          if (!changed) changed = pruneGroupsInTransaction(tr, newState.doc);

          return changed && tr.docChanged ? tr : null;
        },
      }),
    ];
  },
});
