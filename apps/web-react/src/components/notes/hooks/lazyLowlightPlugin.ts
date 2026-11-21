import { findChildren } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const LOWLIGHT_LANGUAGE_LOADED_META = 'lowlight-language-loaded';

interface HastNode {
  type?: string;
  value?: string;
  properties?: {
    className?: string[];
  };
  children?: HastNode[];
}

interface LowlightResult {
  value?: HastNode[];
  children?: HastNode[];
}

export interface LowlightInstance {
  highlight: (language: string, value: string) => LowlightResult;
  highlightAuto: (value: string) => LowlightResult;
  listLanguages: () => string[];
  registered?: (aliasOrLanguage: string) => boolean;
}

function parseHastNodes(
  nodes: HastNode[],
  inheritedClasses: string[] = []
): Array<{ text: string; classes: string[] }> {
  return nodes.flatMap((node) => {
    const classes = [
      ...inheritedClasses,
      ...(node.properties?.className ?? []),
    ];
    if (node.children) {
      return parseHastNodes(node.children, classes);
    }
    return {
      text: node.value ?? '',
      classes,
    };
  });
}

function getHighlightNodes(result: LowlightResult): HastNode[] {
  return result.value ?? result.children ?? [];
}

function computeCodeBlockDecorations(
  doc: ProseMirrorNode,
  name: string,
  lowlight: LowlightInstance,
  defaultLanguage: string | null | undefined
): DecorationSet {
  const registeredLanguages = lowlight.listLanguages();
  if (registeredLanguages.length === 0) {
    return DecorationSet.empty;
  }

  const decorations: Decoration[] = [];

  findChildren(doc, (node) => node.type.name === name).forEach((block) => {
    let from = block.pos + 1;
    const rawLang = (block.node.attrs.language as string | null) || defaultLanguage;
    const language = typeof rawLang === 'string' ? rawLang.trim().toLowerCase() : null;

    let nodes: HastNode[] = [];
    try {
      const isRegistered =
        Boolean(language) &&
        (registeredLanguages.includes(language!) ||
          Boolean(lowlight.registered?.(language!)));

      if (language && isRegistered) {
        nodes = getHighlightNodes(lowlight.highlight(language, block.node.textContent));
      } else if (!language && block.node.textContent.length <= 4096) {
        nodes = getHighlightNodes(lowlight.highlightAuto(block.node.textContent));
      }
    } catch {
      return;
    }

    for (const parsed of parseHastNodes(nodes)) {
      const to = from + parsed.text.length;
      if (parsed.classes.length > 0 && to > from) {
        decorations.push(
          Decoration.inline(from, to, {
            class: parsed.classes.join(' '),
          })
        );
      }
      from = to;
    }
  });

  return DecorationSet.create(doc, decorations);
}

/**
 * Lazy-aware ProseMirror decoration plugin replacing TipTap's static LowlightPlugin.
 * Recomputes syntax-highlighting decorations both on code-block document edits AND
 * whenever an async grammar finishes loading (`LOWLIGHT_LANGUAGE_LOADED_META`).
 */
export function createLazyLowlightPlugin({
  name,
  lowlight,
  defaultLanguage,
}: {
  name: string;
  lowlight: LowlightInstance;
  defaultLanguage?: string | null;
}): Plugin<DecorationSet> {
  const pluginKey = new PluginKey<DecorationSet>('lazyLowlight');

  return new Plugin<DecorationSet>({
    key: pluginKey,
    state: {
      init: (_, { doc }) =>
        computeCodeBlockDecorations(doc, name, lowlight, defaultLanguage),
      apply: (transaction, decorationSet, oldState, newState) => {
        if (transaction.getMeta(LOWLIGHT_LANGUAGE_LOADED_META)) {
          return computeCodeBlockDecorations(
            transaction.doc,
            name,
            lowlight,
            defaultLanguage
          );
        }

        if (!transaction.docChanged) {
          return decorationSet.map(transaction.mapping, transaction.doc);
        }

        const oldNodeName = oldState.selection.$head.parent.type.name;
        const newNodeName = newState.selection.$head.parent.type.name;
        const oldNodes = findChildren(oldState.doc, (node) => node.type.name === name);
        const newNodes = findChildren(newState.doc, (node) => node.type.name === name);

        const encapsulatesCodeBlock = transaction.steps.some((step) => {
          if (!('from' in step) || !('to' in step)) return false;
          const from = step.from;
          const to = step.to;
          if (typeof from !== 'number' || typeof to !== 'number') {
            return false;
          }
          return oldNodes.some(
            (node) => node.pos >= from && node.pos + node.node.nodeSize <= to
          );
        });

        const attrChangedOnCodeBlock = transaction.steps.some((step) => {
          if (!('pos' in step) || typeof step.pos !== 'number') return false;
          const nodeAtPos = newState.doc.nodeAt(step.pos);
          return nodeAtPos?.type.name === name;
        });

        if (
          [oldNodeName, newNodeName].includes(name) ||
          newNodes.length !== oldNodes.length ||
          encapsulatesCodeBlock ||
          attrChangedOnCodeBlock
        ) {
          return computeCodeBlockDecorations(
            transaction.doc,
            name,
            lowlight,
            defaultLanguage
          );
        }

        return decorationSet.map(transaction.mapping, transaction.doc);
      },
    },
    props: {
      decorations(state) {
        return pluginKey.getState(state);
      },
    },
  });
}
