/**
 * groupSpecs.ts
 *
 * Descreve os tipos de "grupo lado a lado" do editor: colunas (`columnGroup`) e
 * cards de link (`linkGroup`).
 *
 * Tudo que o resto do módulo precisa saber sobre um grupo está aqui — como
 * embrulhar conteúdo num filho, como desembrulhar, quantos filhos cabem e onde
 * fica a largura. Para acrescentar um tipo novo, basta somar um spec à lista.
 */

import { Fragment } from '@tiptap/pm/model';
import type { Node as PMNode, Schema } from '@tiptap/pm/model';

export interface GroupSpec {
  /** Nome do node que representa o grupo. */
  groupName: string;
  /** Nome do node que representa cada coluna/célula. */
  childName: string;
  maxChildren: number;
  /** O grupo tem alças de redimensionamento? */
  resizable: boolean;
  /** Atributo do filho que guarda a largura proporcional. */
  widthAttr: string;
  defaultWidth: number;
  /** Rótulo usado nos botões/tooltips. */
  labels: { unwrap: string; balance: string; removeChild: string };

  /** Embrulha conteúdo solto num filho válido do grupo (null se incompatível). */
  wrapAsChild(schema: Schema, content: PMNode[], width: number): PMNode | null;
  /** Conteúdo de um filho, usado ao desfazer o grupo. */
  childContent(child: PMNode): PMNode[];
  /** Este conteúdo pode virar (ou entrar num) grupo deste tipo? */
  acceptsContent(nodes: PMNode[]): boolean;
  /** Um filho ficou sem conteúdo útil? (atoms nunca ficam) */
  isEmptyChild(child: PMNode): boolean;
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

/** Nunca aninhamos um grupo dentro de outro. */
function isStructuralNode(node: PMNode): boolean {
  return GROUP_NAMES.includes(node.type.name) || CHILD_ONLY_NAMES.includes(node.type.name);
}

// ─── Colunas genéricas ────────────────────────────────────────────────────────

export const COLUMN_GROUP_SPEC: GroupSpec = {
  groupName: 'columnGroup',
  childName: 'columnBlock',
  maxChildren: 5,
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
     * `columnBlock` é `block+`, então nunca fica com `childCount === 0`: o
     * ProseMirror insere um parágrafo vazio para manter o documento válido.
     * Vazio, aqui, é conter só blocos de texto sem conteúdo — uma imagem, um
     * card ou um widget não são textblocks, e mantêm a coluna viva.
     */
    let empty = true;
    child.forEach((node) => {
      if (!node.isTextblock || node.content.size > 0) empty = false;
    });
    return empty;
  },
};

// ─── Cards de link lado a lado ────────────────────────────────────────────────

export const LINK_GROUP_SPEC: GroupSpec = {
  groupName: 'linkGroup',
  childName: 'linkPreview',
  maxChildren: 4,
  resizable: true,
  widthAttr: 'width',
  defaultWidth: 50,
  labels: {
    unwrap: 'Desfazer agrupamento (um link por linha)',
    balance: 'Distribuir cards igualmente',
    removeChild: 'Tirar este link do grupo',
  },

  wrapAsChild(schema, content, width) {
    // Aqui o próprio card JÁ é o filho do grupo — não há wrapper intermediário.
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

  isEmptyChild() {
    // `linkPreview` é atom: ou existe, ou foi removido. Nunca fica "vazio".
    return false;
  },
};

/**
 * Ordem importa: o spec mais específico vem primeiro, para que arrastar um card
 * de link sobre outro card gere um `linkGroup` e não um `columnGroup`.
 */
export const GROUP_SPECS: GroupSpec[] = [LINK_GROUP_SPEC, COLUMN_GROUP_SPEC];

export function getSpecForGroup(groupNode: PMNode): GroupSpec | null {
  return GROUP_SPECS.find((spec) => spec.groupName === groupNode.type.name) ?? null;
}

export function getSpecByName(groupName: string): GroupSpec | null {
  return GROUP_SPECS.find((spec) => spec.groupName === groupName) ?? null;
}

/**
 * Escolhe que tipo de grupo criar ao soltar `dragged` sobre `target`.
 * Ambos precisam ser aceitos pelo mesmo spec.
 */
export function pickSpecForPair(dragged: PMNode[], target: PMNode): GroupSpec | null {
  if (isStructuralNode(target)) return null;
  return (
    GROUP_SPECS.find((spec) => spec.acceptsContent(dragged) && spec.acceptsContent([target])) ?? null
  );
}
