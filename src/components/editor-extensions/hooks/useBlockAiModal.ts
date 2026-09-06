import { useState, useRef, useCallback, useContext } from 'react';
import type { Editor } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { DOMSerializer } from 'prosemirror-model';
import { StoreContext, getStoreState, getStoreDispatch } from '../../../store/useStore';
import { triggerToast } from '../../ui/ToastContext';
import type { AiChatMessage } from '../../modals/AiPromptModal';
import { buildCodeBlockRules, buildCodeBlockSystemInstruction } from './codeBlockSyntaxHelper';
import { markdownToHtml } from './editorMarkdownHelper';

export type BlockAiType = 'blockquoteToggle' | 'toggleBlock' | 'codeBlock' | 'blockquote';

export interface UseBlockAiModalProps {
  editor: Editor | null;
  node: PMNode;
  getPos: () => number | undefined;
  updateAttributes: (attrs: Record<string, unknown>) => void;
  blockType: BlockAiType;
}

export function useBlockAiModal({
  editor,
  node,
  getPos,
  updateAttributes,
  blockType,
}: UseBlockAiModalProps) {
  const storeCtx = useContext(StoreContext);
  const state = storeCtx?.state || getStoreState();
  const dispatch = storeCtx?.dispatch || getStoreDispatch();

  const [isOpen, setIsOpen] = useState(false);
  const [anchorPos, setAnchorPos] = useState<{ x: number; y: number } | null>(null);
  const aiButtonRef = useRef<HTMLButtonElement | null>(null);

  // Stable session chat ID for the lifetime of this mounted block
  const [chatId] = useState<string>(() => `block_ai_${blockType}_${Math.random().toString(36).slice(2, 10)}`);
  const [localMessages, setLocalMessages] = useState<AiChatMessage[]>([]);

  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
  const pageId = activeTab?.pageId || null;

  const messages: AiChatMessage[] =
    localMessages.length > 0
      ? localMessages
      : state.aiChatSessions[chatId]?.messages || [];

  const handleOpenAi = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();
    setAnchorPos({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 6,
    });
    setIsOpen((prev) => !prev);
  }, []);

  const handleCloseAi = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleMessageAdd = useCallback(
    (id: string, msgs: AiChatMessage[]) => {
      setLocalMessages(msgs);
      dispatch({
        type: 'UPDATE_AI_CHAT',
        session: {
          id,
          pageId: pageId || '',
          pageTitle:
            blockType === 'codeBlock'
              ? 'Bloco de Código'
              : blockType === 'blockquote'
              ? 'Callout'
              : (node.attrs.title as string) || 'Toggle',
          contextText: '',
          messages: msgs,
          updatedAt: Date.now(),
        },
      });
    },
    [dispatch, pageId, blockType, node.attrs.title]
  );

  const handleClearChat = useCallback(
    (id: string) => {
      setLocalMessages([]);
      dispatch({ type: 'DELETE_AI_CHAT', id });
    },
    [dispatch]
  );

  // Build the strict universe context for Gemini
  const buildContextText = useCallback((): string => {
    if (blockType === 'codeBlock') {
      const lang = (node.attrs.language as string) || 'auto';
      const code = node.textContent || '';
      return buildCodeBlockRules(lang, code);
    }

    if (blockType === 'blockquote') {
      let bodyText = '';
      if (editor) {
        try {
          const serializer = DOMSerializer.fromSchema(editor.schema);
          const tempDiv = document.createElement('div');
          tempDiv.appendChild(serializer.serializeFragment(node.content));
          bodyText = tempDiv.innerText || tempDiv.textContent || node.textContent || '';
        } catch {
          bodyText = node.textContent || '';
        }
      } else {
        bodyText = node.textContent || '';
      }

      return `[BLOCO ATUAL]
Tipo: Callout (Destaque)
Conteúdo atual do bloco:
${bodyText}

REGRAS E LIMITES MANDATÓRIOS:
1. Você é o assistente de IA encarregado EXCLUSIVAMENTE deste bloco de Callout (Destaque).
2. O seu universo de atuação e modificação é RESTRITO a este bloco específico. NUNCA tente editar, remover ou adicionar conteúdo fora deste bloco, a menos que o usuário solicite explicitamente contexto adicional.
3. Ao sugerir alterações no conteúdo do callout, forneça uma explicação breve e o conteúdo formatado dentro de um bloco \`\`\`markdown ... \`\`\`.`;
    }

    const isCallout = blockType === 'blockquoteToggle';
    const typeLabel = isCallout ? 'Toggle Callout (Destaque Recolhível)' : 'Toggle (Lista Oculta)';
    const title = (node.attrs.title as string) || '';

    let bodyText = '';
    if (editor) {
      try {
        const serializer = DOMSerializer.fromSchema(editor.schema);
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(serializer.serializeFragment(node.content));
        bodyText = tempDiv.innerText || tempDiv.textContent || node.textContent || '';
      } catch {
        bodyText = node.textContent || '';
      }
    } else {
      bodyText = node.textContent || '';
    }

    return `[BLOCO ATUAL]
Tipo: ${typeLabel}
Título atual: "${title}"
Conteúdo atual do bloco:
${bodyText}

REGRAS E LIMITES MANDATÓRIOS:
1. Você é o assistente de IA encarregado EXCLUSIVAMENTE deste bloco de ${typeLabel}.
2. O seu universo de atuação e modificação é RESTRITO a este bloco específico. NUNCA tente editar, remover ou adicionar conteúdo fora deste bloco, a menos que o usuário solicite explicitamente contexto adicional.
3. Ao sugerir alterações no conteúdo do toggle, forneça uma explicação breve e o conteúdo formatado dentro de um bloco \`\`\`markdown ... \`\`\`. Se sugerir ou alterar o título do toggle, indique claramente na primeira linha: "Título: [Novo Título]".`;
  }, [blockType, node, editor]);

  // Build the system instruction for Gemini
  const buildSystemInstruction = useCallback((): string => {
    if (blockType === 'codeBlock') {
      const lang = (node.attrs.language as string) || 'auto';
      return buildCodeBlockSystemInstruction(lang);
    }

    if (blockType === 'blockquote') {
      return 'Você é um assistente de IA encarregado EXCLUSIVAMENTE deste callout (destaque). O seu universo de atuação e edição é 100% RESTRITO a este bloco. NUNCA tente editar, adicionar ou alterar nada fora dele. Ao sugerir alterações no conteúdo do callout, estruture a resposta com formatação rica em markdown (negrito, itálico, listas, etc.) e envolva a versão sugerida final em um bloco ```markdown ... ```.';
    }

    if (blockType === 'blockquoteToggle') {
      return 'Você é um assistente de IA encarregado EXCLUSIVAMENTE deste destaque recolhível (toggle callout). O seu universo de atuação e edição é 100% RESTRITO a este bloco. NUNCA tente editar, adicionar ou alterar nada fora dele. Ao sugerir alterações no conteúdo do toggle, estruture a resposta com formatação rica em markdown (negrito, itálico, listas, etc.) e envolva a versão sugerida final em um bloco ```markdown ... ```. Se sugerir ou alterar o título do toggle, indique na primeira linha: "Título: [Novo Título]".';
    }

    return 'Você é um assistente de IA encarregado EXCLUSIVAMENTE desta lista oculta (toggle). O seu universo de atuação e edição é 100% RESTRITO a este bloco. NUNCA tente editar, adicionar ou alterar nada fora dele. Ao sugerir alterações no conteúdo do toggle, estruture a resposta com formatação rica em markdown (negrito, itálico, listas, etc.) e envolva a versão sugerida final em um bloco ```markdown ... ```. Se sugerir ou alterar o título do toggle, indique na primeira linha: "Título: [Novo Título]".';
  }, [blockType, node.attrs.language]);

  // Apply replacement strictly bounded to this block node
  const handleApplyReplacement = useCallback(
    (replacementText: string, newTitle?: string) => {
      if (typeof getPos !== 'function' || !editor) return;
      const pos = getPos();
      if (typeof pos !== 'number') return;

      if (blockType === 'codeBlock') {
        let cleanCode = replacementText;
        const codeBlockMatch = replacementText.match(/```([a-zA-Z0-9_-]+)?\s*\n([\s\S]*?)```/);
        if (codeBlockMatch) {
          const detectedLang = codeBlockMatch[1];
          cleanCode = codeBlockMatch[2].trimEnd();
          if (detectedLang && (!node.attrs.language || node.attrs.language === 'auto')) {
            updateAttributes({ language: detectedLang });
          }
        } else {
          cleanCode = cleanCode.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/\n?```$/, '').trimEnd();
        }

        const { state, view } = editor;
        const tr = state.tr;
        const textNode = cleanCode ? state.schema.text(cleanCode) : null;
        // The text content of the code block is located strictly between pos + 1 and pos + node.nodeSize - 1
        tr.replaceWith(pos + 1, pos + node.nodeSize - 1, textNode ? [textNode] : []);
        view.dispatch(tr);
        triggerToast('Código atualizado com sucesso!', 'success');
        return;
      }

      // For blockquote, toggle callout, and toggle
      let cleanContent = replacementText;
      const mdMatch = replacementText.match(/```(?:markdown)?\s*\n([\s\S]*?)```/);
      if (mdMatch) {
        cleanContent = mdMatch[1].trim();
      }

      if (newTitle !== undefined && newTitle !== node.attrs.title) {
        updateAttributes({ title: newTitle });
      }

      // Convert markdown to semantic HTML so TipTap creates rich formatted nodes (bold, lists, headings)
      const htmlContent = markdownToHtml(cleanContent);

      // Replace inner content strictly between pos + 1 and pos + node.nodeSize - 1
      editor
        .chain()
        .focus()
        .deleteRange({ from: pos + 1, to: pos + node.nodeSize - 1 })
        .insertContentAt(pos + 1, htmlContent)
        .run();

      triggerToast(
        blockType === 'blockquote'
          ? 'Callout atualizado com sucesso!'
          : blockType === 'blockquoteToggle'
          ? 'Destaque atualizado com sucesso!'
          : 'Toggle atualizado com sucesso!',
        'success'
      );
    },
    [editor, getPos, node, blockType, updateAttributes]
  );

  // Insert content at the end inside this block node
  const handleInsertContent = useCallback(
    (content: string) => {
      if (typeof getPos !== 'function' || !editor) return;
      const pos = getPos();
      if (typeof pos !== 'number') return;

      if (blockType === 'codeBlock') {
        let cleanCode = content;
        const codeBlockMatch = content.match(/```(?:[a-zA-Z0-9_-]+)?\s*\n([\s\S]*?)```/);
        if (codeBlockMatch) {
          cleanCode = codeBlockMatch[1].trimEnd();
        } else {
          cleanCode = cleanCode.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/\n?```$/, '').trimEnd();
        }

        const { state, view } = editor;
        const tr = state.tr;
        const endPos = pos + node.nodeSize - 1;
        const textToInsert = node.textContent ? '\n' + cleanCode : cleanCode;
        tr.insert(endPos, state.schema.text(textToInsert));
        view.dispatch(tr);
        triggerToast('Código adicionado ao bloco!', 'success');
        return;
      }

      let cleanContent = content;
      const mdMatch = content.match(/```(?:markdown)?\s*\n([\s\S]*?)```/);
      if (mdMatch) {
        cleanContent = mdMatch[1].trim();
      }

      const endPos = pos + node.nodeSize - 1;
      const htmlContent = markdownToHtml(cleanContent);
      editor.chain().focus().insertContentAt(endPos, htmlContent).run();
      triggerToast(
        blockType === 'blockquote'
          ? 'Conteúdo inserido no callout!'
          : 'Conteúdo inserido no final!',
        'success'
      );
    },
    [editor, getPos, node, blockType]
  );

  const blockBadge =
    blockType === 'codeBlock'
      ? 'IA • Bloco de Código'
      : blockType === 'blockquoteToggle'
      ? 'IA • Toggle Callout'
      : blockType === 'toggleBlock'
      ? 'IA • Lista Oculta'
      : 'IA • Callout';

  const blockTitle =
    blockType === 'codeBlock'
      ? ((node.attrs.language as string) || 'auto')
      : blockType === 'blockquote'
      ? 'Destaque'
      : ((node.attrs.title as string) || 'Sem título');

  const targetType: 'code' | 'blockquoteToggle' | 'toggle' | 'blockquote' =
    blockType === 'codeBlock'
      ? 'code'
      : blockType === 'blockquoteToggle'
      ? 'blockquoteToggle'
      : blockType === 'toggleBlock'
      ? 'toggle'
      : 'blockquote';

  return {
    isOpen,
    anchorPos,
    aiButtonRef,
    chatId,
    messages,
    contextText: buildContextText(),
    systemInstruction: buildSystemInstruction(),
    blockBadge,
    blockTitle,
    targetType,
    handleOpenAi,
    handleCloseAi,
    handleMessageAdd,
    handleClearChat,
    handleApplyReplacement,
    handleInsertContent,
  };
}
