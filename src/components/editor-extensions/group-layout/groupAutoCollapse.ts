/**
 * groupAutoCollapse.ts
 *
 * Faz o layout se desmontar sozinho quando deixa de fazer sentido.
 *
 * ─── O problema ──────────────────────────────────────────────────────────────
 * `columnBlock` tem conteúdo `block+`. Ao arrastar o único bloco de uma coluna
 * para fora, o ProseMirror recoloca um parágrafo vazio para manter o documento
 * válido — a coluna morta continua lá ocupando metade da largura. E como o
 * grupo é `columnBlock{2,5}`, apagar essa coluna à mão também não resolve: o PM
 * a recria na mesma transação (medido: o resultado é `columnGroup:[1,1]`).
 *
 * ─── A heurística ────────────────────────────────────────────────────────────
 * Colapsar toda coluna vazia seria agressivo demais: quem seleciona o texto da
 * coluna e apaga para redigitar perderia o layout embaixo do cursor.
 *
 * Então a regra é: colapsa se o filho está vazio E a seleção NÃO está dentro
 * dele. É isso que separa os dois casos — ao arrastar o conteúdo para fora o
 * cursor acompanha o conteúdo e termina fora da coluna; ao apagar para
 * redigitar, o cursor fica exatamente ali dentro.
 *
 * Como a UI nunca cria uma coluna vazia (os dois caminhos de criação exigem
 * conteúdo), "vazio" só pode ter vindo de uma remoção. Isso tem um efeito
 * colateral bem-vindo: documentos que já ficaram com colunas mortas antes desta
 * correção se limpam sozinhos na primeira edição.
 *
 * Rede de segurança à parte: qualquer grupo que fique com menos de dois filhos
 * é desfeito. Esse caso é inequívoco — o schema nem permite.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Fragment } from '@tiptap/pm/model';
import { getSpecForGroup } from './groupSpecs';
import type { GroupSpec } from './groupSpecs';
import { getChildren, pruneGroupsInTransaction } from './groupCommands';

/** Conta quantas vezes o colapso já reentrou, para não haver laço infinito. */
const AUTO_COLLAPSE_META = 'groupLayout:autoCollapse';
const MAX_CASCADE = 3;

interface EmptyChildTarget {
  spec: GroupSpec;
  groupPos: number;
  groupNode: PMNode;
  indices: number[];
}

/** Filhos vazios cuja remoção é segura (seleção fora deles). */
function findCollapsibleChildren(state: EditorState): EmptyChildTarget[] {
  const targets: EmptyChildTarget[] = [];

  state.doc.descendants((node, pos) => {
    const spec = getSpecForGroup(node);
    if (!spec) return true;

    // Se o usuário está com o cursor ou seleção em QUALQUER ponto dentro do grupo,
    // não remove colunas vazias (ele pode estar escrevendo ou acabou de criar a coluna).
    const selectionInsideGroup = state.selection.from >= pos && state.selection.to <= pos + node.nodeSize;
    if (selectionInsideGroup) return false;

    const children = getChildren(node);
    const indices: number[] = [];

    children.forEach((child, index) => {
      if (!spec.isEmptyChild(child)) return;
      indices.push(index);
    });

    if (indices.length > 0) {
      targets.push({ spec, groupPos: pos, groupNode: node, indices });
    }
    return false; // grupos não aninham
  });

  return targets;
}

/** Remove vários filhos de um grupo numa transação já em andamento. */
function removeChildrenInTransaction(tr: Transaction, target: EmptyChildTarget): boolean {
  const { spec, groupPos, groupNode, indices } = target;
  const drop = new Set(indices);
  const remaining = getChildren(groupNode).filter((_, index) => !drop.has(index));

  // As DUAS pontas precisam ser remapeadas. Antes o início era mapeado e o fim
  // era `from + groupNode.nodeSize` — o tamanho de ANTES da transação. Com dois
  // grupos afetados na mesma transação, a faixa do segundo caía no lugar errado
  // e a substituição corrompia o documento.
  const from = tr.mapping.map(groupPos, -1);
  const to = tr.mapping.map(groupPos + groupNode.nodeSize, 1);

  try {
    if (remaining.length <= 1) {
      const flattened = remaining.flatMap((child) => spec.childContent(child));
      if (flattened.length === 0) {
        tr.delete(from, to);
      } else {
        tr.replaceWith(from, to, Fragment.fromArray(flattened));
      }
    } else {
      const width = Math.round((100 / remaining.length) * 10) / 10;
      const rebalanced = remaining.map((child) =>
        child.type.create({ ...child.attrs, [spec.widthAttr]: width }, child.content, child.marks)
      );
      tr.replaceWith(from, to, groupNode.type.create(groupNode.attrs, rebalanced));
    }
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

          const depth = transactions.reduce(
            (max, tr) => Math.max(max, Number(tr.getMeta(AUTO_COLLAPSE_META)) || 0),
            0
          );
          if (depth >= MAX_CASCADE) return null;

          const tr = newState.tr;
          tr.setMeta(AUTO_COLLAPSE_META, depth + 1);

          // 1. Colunas que ficaram vazias (de trás para frente: as posições
          //    anteriores continuam válidas).
          const targets = findCollapsibleChildren(newState).reverse();
          let changed = false;
          for (const target of targets) {
            if (removeChildrenInTransaction(tr, target)) changed = true;
          }

          // 2. Rede de segurança para grupos degenerados que sobraram.
          if (!changed) {
            changed = pruneGroupsInTransaction(tr, newState.doc);
          }

          return changed && tr.docChanged ? tr : null;
        },
      }),
    ];
  },
});
