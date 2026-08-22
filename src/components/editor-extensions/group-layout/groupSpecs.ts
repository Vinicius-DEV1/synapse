/**
 * groupSpecs.ts
 *
 * Descreve os tipos de "grupo lado a lado" do editor: colunas (`columnGroup`) e
 * cards de link (`linkGroup`).
 *
 * Group specifications defining wrapping, unwrapping, capacity,
 * and width attributes for group layouts.
 * column width. To add a new layout type, simply append its spec to the registry.
 */

import { Fragment } from '@tiptap/pm/model';
import type { Node as PMNode, Schema } from '@tiptap/pm/model';

export interface GroupSpec {
  /** Nome do node que representa o grupo. */
  groupName: string;
  /** Node type name representing individual column/cell. */
  childName: string;
  maxChildren: number;
  /** Indicates whether group renders resize handles. */
  resizable: boolean;
  /** Atributo do filho que guarda a largura proporcional. */
  widthAttr: string;
  defaultWidth: number;
  /** UI label used for buttons/tooltips. */
  labels: { unwrap: string; balance: string; removeChild: string };

  /** Wraps linear content into a valid group child node (null if incompatible). */
  wrapAsChild(schema: Schema, content: PMNode[], width: number): PMNode | null;
  /** Child node content extractor used when unwrapping group. */
  childContent(child: PMNode): PMNode[];
  /** Predicate determining if content can be grouped into this type. */
  acceptsContent(nodes: PMNode[]): boolean;
  /** Predicate determining if a child cell is empty. */
  isEmptyChild(child: PMNode): boolean;
  /**
   * Indicates whether child content is editable inline in place.
   * When editable, empty cells during typing must respect active selection;
   * when non-editable (e.g. link cards), empty cards are immediately collapsed.
   */
  editableChildren: boolean;
}

function toBlocks(schema: Schema, nodes: PMNode[]): PMNode[] | null {
  const paragraph = schema.nodes.paragraph;
  const blocks: PMNode[] = [];
  for (const node of nodes) {
    if (node.isBlock) {
      blocks.push(node);
    } else if (paragraph) {
      blocks.push(paragraph.create(null, Fragment.from(node)));
    } else {
      return null;
    }
  }
  return blocks.length > 0 ? blocks : null;
}

const GROUP_NAMES = ['columnGroup', 'linkGroup'];
const CHILD_ONLY_NAMES = ['columnBlock'];

/** Structural guard: never nest a group inside another group. */
function isStructuralNode(node: PMNode): boolean {
  return GROUP_NAMES.includes(node.type.name) || CHILD_ONLY_NAMES.includes(node.type.name);
}

// ─── Generic Columns ────────────────────────────────────────────────────────

export const COLUMN_GROUP_SPEC: GroupSpec = {
  groupName: 'columnGroup',
  childName: 'columnBlock',
  maxChildren: 5,
  editableChildren: true,
  resizable: true,
  widthAttr: 'width',
  defaultWidth: 50,
  labels: {
    unwrap: 'Desfazer colunas (empilhar novamente)',
    balance: 'Distribuir colunas igualmente',
    removeChild: 'Remover esta coluna (o conteúdo sai do grupo)',
  },

  wrapAsChild(schema, content, width) {
    const childType = schema.nodes.columnBlock;
    if (!childType) return null;
    const blocks = toBlocks(schema, content);
    if (!blocks) return null;
    try {
      return childType.create({ width }, Fragment.fromArray(blocks));
    } catch {
      return null;
    }
  },

  childContent(child) {
    const out: PMNode[] = [];
    child.forEach((node) => out.push(node));
    return out;
  },

  acceptsContent(nodes) {
    return nodes.length > 0 && !nodes.some(isStructuralNode);
  },

  isEmptyChild(child) {
    if (child.childCount === 0) return true;

    /*
     * `columnBlock` is `block+`, so ProseMirror enforces non-empty by inserting
     * an empty paragraph. A column is treated as empty only when containing empty
     * text blocks without widgets, cards, or images.
     */
    let empty = true;
    child.forEach((node) => {
      if (!node.isTextblock || node.content.size > 0) empty = false;
    });
    return empty;
  },
};

// ─── Link Cards Side-by-Side ──────────────────────────────────────────────────

export const LINK_GROUP_SPEC: GroupSpec = {
  groupName: 'linkGroup',
  childName: 'linkPreview',
  maxChildren: 4,
  editableChildren: false,
  resizable: true,
  widthAttr: 'width',
  defaultWidth: 50,
  labels: {
    unwrap: 'Desfazer agrupamento (um link por linha)',
    balance: 'Distribuir cards igualmente',
    removeChild: 'Tirar este link do grupo',
  },

  wrapAsChild(schema, content, width) {
    // Here card itself IS the group child - no intermediate wrapper.
    const childType = schema.nodes.linkPreview;
    if (!childType || content.length !== 1) return null;
    const node = content[0];
    if (node.type !== childType) return null;
    return childType.create({ ...node.attrs, width }, node.content, node.marks);
  },

  childContent(child) {
    return [child];
  },

  acceptsContent(nodes) {
    return nodes.length > 0 && nodes.every((node) => node.type.name === 'linkPreview');
  },

  isEmptyChild(child) {
    /*
     * As an atom node, `linkPreview` is empty when lacking a valid URL.
     * When dragging a card out of a 2-item `linkGroup`, schema minimum fills an
     * empty item which this rule cleans up.
     */
    return !String(child.attrs.url ?? '').trim();
  },
};

/**
 * Order matters: specific specs precede generic ones so dragging a link card
 * onto another card creates a `linkGroup` rather than a `columnGroup`.
 */
export const GROUP_SPECS: GroupSpec[] = [LINK_GROUP_SPEC, COLUMN_GROUP_SPEC];

export function getSpecForGroup(groupNode: PMNode): GroupSpec | null {
  return GROUP_SPECS.find((spec) => spec.groupName === groupNode.type.name) ?? null;
}

export function getSpecByName(groupName: string): GroupSpec | null {
  return GROUP_SPECS.find((spec) => spec.groupName === groupName) ?? null;
}

/**
 * Selects group spec to instantiate when dropping `dragged` over `target`.
 * Ambos precisam ser aceitos pelo mesmo spec.
 */
export function pickSpecForPair(dragged: PMNode[], target: PMNode): GroupSpec | null {
  if (isStructuralNode(target)) return null;
  return (
    GROUP_SPECS.find((spec) => spec.acceptsContent(dragged) && spec.acceptsContent([target])) ?? null
  );
}
