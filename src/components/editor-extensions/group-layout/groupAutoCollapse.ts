/**
 * Extensão GroupAutoCollapse
 *
 * Desfaz automaticamente colunas ou grupos vazios após remoção ou arrasto de conteúdo,
 * garantindo a integridade da estrutura sem deixar blocos órfãos ou vazios.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import type { Node as PMNode } from '@tiptap/pm/model';
import { ySyncPluginKey } from 'y-prosemirror';
import { getSpecForGroup } from './groupSpecs';
import type { GroupSpec } from './groupSpecs';
import {
  getChildren,
  pruneGroupsInTransaction,
  safeNodeAt,
  writeGroupRemainderInTr,
} from './groupCommands';

const AUTO_COLLAPSE_META = 'groupLayout:autoCollapse';
const MAX_CASCADE = 3;

interface EmptyChildTarget {
  spec: GroupSpec;
  groupPos: number;
  groupNode: PMNode;
  indices: number[];
}

/** Identifies empty child nodes whose selection is not actively within group. */
function findCollapsibleChildren(state: EditorState): EmptyChildTarget[] {
  const targets: EmptyChildTarget[] = [];

  state.doc.descendants((node, pos) => {
    const spec = getSpecForGroup(node);
    if (!spec) return true;

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

  const range = {
    from: tr.mapping.map(groupPos, -1),
    to: tr.mapping.map(groupPos + groupNode.nodeSize, 1),
  };

  const current = safeNodeAt(tr.doc, range.from);
  if (!current || current.type !== groupNode.type) return false;
  if (current.childCount !== groupNode.childCount) return false;

  const drop = new Set(indices);
  const remaining = getChildren(current).filter((_, index) => !drop.has(index));

  try {
    writeGroupRemainderInTr(tr, spec, current, range, remaining);
  } catch (err) {
    console.warn('[group-layout] Erro ao colapsar coluna vazia:', err);
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
          try {
            if (!transactions.some((tr) => tr.docChanged)) return null;

            // Ignore remote Yjs transactions to respect remote author selection
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

            const targets = findCollapsibleChildren(newState).reverse();
            let changed = false;
            for (const target of targets) {
              if (removeChildrenInTransaction(tr, target)) changed = true;
            }

            if (!changed) changed = pruneGroupsInTransaction(tr, newState.doc);

            return changed && tr.docChanged ? tr : null;
          } catch (err) {
            console.error('[group-layout] Erro inesperado em GroupAutoCollapse:', err);
            return null;
          }
        },
      }),
    ];
  },
});
