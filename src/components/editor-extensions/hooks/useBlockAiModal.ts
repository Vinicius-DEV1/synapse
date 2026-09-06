import { useState, useRef, useCallback, useContext } from 'react';
import type { Editor } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { DOMSerializer } from 'prosemirror-model';
import { StoreContext, getStoreState, getStoreDispatch } from '../../../store/useStore';
import { triggerToast } from '../../ui/ToastContext';
import type { AiChatMessage } from '../../modals/AiPromptModal';
import { buildCodeBlockRules, buildCodeBlockSystemInstruction } from './codeBlockSyntaxHelper';
import { markdownToHtml } from './editorMarkdownHelper';
import { parseSearchReplaceBlocks, applySearchReplace, computeMinimalDiffRange } from './blockDiffEngine';

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
3. CONTEXTO E ESTRUTURA: Você já está operando no interior deste Callout. Por padrão, ao responder ou editar o texto, não replique redundantemente a casca de citação externa (não prefixe todas as linhas com '> ' à toa, pois o bloco já é um callout visual).
4. ELEMENTOS RICOS E CONTEXTO: O interior deste callout é rico e flexível. Conforme a solicitação do usuário ou a necessidade do contexto, você pode e deve utilizar livremente:
   - Parágrafos bem estruturados, negrito, itálico e destaques;
   - Listas numeradas, com marcadores ou tarefas;
   - Blocos de código com destaque de sintaxe (\`\`\`linguagem ... \`\`\`) quando solicitado código, scripts ou exemplos;
   - Citações internas (> citação) se for de fato uma citação real ou aviso desejado;
   - Tabelas e outros elementos compatíveis com Markdown.
5. RESPOSTA E FORMATAÇÃO: Apresente o conteúdo diretamente em Markdown. Se você incluir explicações antes da proposta final, envolva o conteúdo a ser inserido no bloco em um bloco delimitado (se o conteúdo contiver código com 3 crases, use 4 crases \`\`\`\`markdown ... \`\`\`\` para delimitá-lo perfeitamente).`;
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
3. CONTEXTO E ESTRUTURA: Este bloco possui um Título visível e um Conteúdo interno expansível. Você já está operando no interior dele. Não replique a casca externa do próprio toggle (não recrie outro toggle idêntico englobando tudo à toa).
4. TÍTULO DO TOGGLE: Se sugerir ou alterar o título do toggle, indique claramente no início da proposta: "Título: [Novo Título]".
5. ELEMENTOS RICOS E CONTEXTO: O interior deste toggle é um documento rico e versátil. Conforme a demanda do usuário e do contexto, você pode e deve usar livremente:
   - Blocos de código com destaque de sintaxe (\`\`\`linguagem ... \`\`\`) quando solicitado código, scripts ou exemplos;
   - Callouts e destaques (> aviso) caso deseje destacar uma citação ou alerta dentro do toggle;
   - Listas, subtítulos, negrito, itálico e tabelas.
6. RESPOSTA E FORMATAÇÃO: Apresente o conteúdo diretamente em Markdown. Se você incluir explicações antes da proposta final, envolva o conteúdo sugerido para o corpo em um bloco delimitado (se o conteúdo contiver blocos de código com 3 crases, use 4 crases \`\`\`\`markdown ... \`\`\`\` para delimitá-lo perfeitamente).`;
  }, [blockType, node, editor]);

  const getRawBlockContent = useCallback((): string => {
    if (blockType === 'codeBlock') {
      return node.textContent || '';
    }

    if (editor) {
      try {
        const serializer = DOMSerializer.fromSchema(editor.schema);
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(serializer.serializeFragment(node.content));
        return tempDiv.innerText || tempDiv.textContent || node.textContent || '';
      } catch {
        return node.textContent || '';
      }
    }
    return node.textContent || '';
  }, [blockType, node, editor]);

  // Build the system instruction for Gemini
  const buildSystemInstruction = useCallback((): string => {
    const surgicalGuidance = `
DICA DE EDIÇÃO CIRÚRGICA (DIFF):
Quando for solicitado alterar, melhorar ou acrescentar trechos pontuais (sem reescrever o bloco inteiro), você pode emitir um ou mais blocos no formato:
<<<<<<< SEARCH
[trecho exato original existente neste bloco]
=======
[novo trecho melhorado/corrigido]
>>>>>>>
Ou, se apropriado, pode emitir a versão completa revisada do bloco.`;

    if (blockType === 'codeBlock') {
      const lang = (node.attrs.language as string) || 'auto';
      return `${buildCodeBlockSystemInstruction(lang)}\n${surgicalGuidance}`;
    }

    if (blockType === 'blockquote') {
      return `Você é um assistente de IA encarregado EXCLUSIVAMENTE deste callout (destaque). O seu universo de atuação e edição é 100% RESTRITO a este bloco. NUNCA tente editar, adicionar ou alterar nada fora dele.
DIRETRIZES DE CONTEXTO E ESTRUTURA:
1. Você já está DENTRO do callout. Não crie cascas de citação redundantes (não prefixe todas as linhas com '> ' à toa, pois o bloco já é um callout visual).
2. O interior do bloco é livre e rico. Conforme solicitado pelo usuário ou demandado pelo contexto, utilize livremente blocos de código (\`\`\`linguagem ... \`\`\`), listas, citações internas (> citação), negrito, itálico e tabelas.
3. Se envolver a proposta final em bloco delimitador e ela contiver blocos de código de 3 crases, use 4 crases (\`\`\`\`markdown ... \`\`\`\`) para evitar colisão de sintaxe.\n${surgicalGuidance}`;
    }

    if (blockType === 'blockquoteToggle') {
      return `Você é um assistente de IA encarregado EXCLUSIVAMENTE deste destaque recolhível (toggle callout). O seu universo de atuação e edição é 100% RESTRITO a este bloco. NUNCA tente editar, adicionar ou alterar nada fora dele.
DIRETRIZES DE CONTEXTO E ESTRUTURA:
1. Você já está DENTRO deste toggle. Não recrie outro toggle idêntico redundante englobando tudo.
2. O corpo interno é livre e rico: você pode e deve incluir blocos de código (\`\`\`linguagem ... \`\`\`), callouts internos (> aviso), listas, subtítulos e tabelas conforme demandado pelo contexto.
3. Se sugerir ou alterar o título do toggle, indique na primeira linha: "Título: [Novo Título]".
4. Se envolver a proposta final em bloco delimitador e ela contiver blocos de código de 3 crases, use 4 crases (\`\`\`\`markdown ... \`\`\`\`) para evitar colisão de sintaxe.\n${surgicalGuidance}`;
    }

    return `Você é um assistente de IA encarregado EXCLUSIVAMENTE desta lista oculta (toggle). O seu universo de atuação e edição é 100% RESTRITO a este bloco. NUNCA tente editar, adicionar ou alterar nada fora dele.
DIRETRIZES DE CONTEXTO E ESTRUTURA:
1. Você já está DENTRO deste toggle. Não recrie outro toggle idêntico redundante englobando tudo.
2. O conteúdo interno é livre e rico: use livremente blocos de código (\`\`\`linguagem ... \`\`\`), destaques/callouts internos (> nota), listas e subtítulos conforme o contexto solicitar.
3. Se sugerir ou alterar o título do toggle, indique na primeira linha: "Título: [Novo Título]".
4. Se envolver a proposta final em bloco delimitador e ela contiver blocos de código de 3 crases, use 4 crases (\`\`\`\`markdown ... \`\`\`\`) para evitar colisão de sintaxe.\n${surgicalGuidance}`;
  }, [blockType, node.attrs.language]);

  // Apply replacement strictly bounded to this block node
  const handleApplyReplacement = useCallback(
    (replacementText: string, newTitle?: string) => {
      if (typeof getPos !== 'function' || !editor) return;
      const pos = getPos();
      if (typeof pos !== 'number') return;

      const currentRaw = getRawBlockContent();
      const searchReplaceBlocks = parseSearchReplaceBlocks(replacementText);

      if (blockType === 'codeBlock') {
        let cleanCode = replacementText;

        if (searchReplaceBlocks.length > 0) {
          const srResult = applySearchReplace(currentRaw, searchReplaceBlocks);
          if (!srResult.success) {
            triggerToast(srResult.error || 'Falha ao aplicar alteração cirúrgica no código.', 'error');
            return;
          }
          cleanCode = srResult.result;
        } else {
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
        }

        const { state, view } = editor;
        const tr = state.tr;

        // Try minimal surgical diff range to preserve unchanged lines and cursor stability
        const minimalDiff = computeMinimalDiffRange(currentRaw, cleanCode);
        if (minimalDiff) {
          const { from, to, replacement } = minimalDiff;
          const textNode = replacement ? state.schema.text(replacement) : null;
          tr.replaceWith(pos + 1 + from, pos + 1 + to, textNode ? [textNode] : []);
          view.dispatch(tr);
          const hunkMsg =
            searchReplaceBlocks.length > 0
              ? `Alteração cirúrgica aplicada (${searchReplaceBlocks.length} trecho(s))!`
              : 'Código atualizado com sucesso!';
          triggerToast(hunkMsg, 'success');
          return;
        } else if (cleanCode === currentRaw) {
          triggerToast('Nenhuma alteração necessária.', 'info');
          return;
        }

        // Fallback: replace full code block content
        const textNode = cleanCode ? state.schema.text(cleanCode) : null;
        tr.replaceWith(pos + 1, pos + node.nodeSize - 1, textNode ? [textNode] : []);
        view.dispatch(tr);
        triggerToast('Código atualizado com sucesso!', 'success');
        return;
      }

      // For blockquote, toggle callout, and toggle
      let cleanContent = replacementText;

      if (searchReplaceBlocks.length > 0) {
        const srResult = applySearchReplace(currentRaw, searchReplaceBlocks);
        if (!srResult.success) {
          triggerToast(srResult.error || 'Falha ao aplicar alteração cirúrgica.', 'error');
          return;
        }
        cleanContent = srResult.result;
      }

      if (newTitle !== undefined && newTitle !== node.attrs.title) {
        updateAttributes({ title: newTitle });
      }

      // Convert markdown to semantic HTML so TipTap creates rich formatted nodes (bold, lists, headings, code, quotes)
      const htmlContent = markdownToHtml(cleanContent);

      // Replace inner content strictly between pos + 1 and pos + node.nodeSize - 1
      editor
        .chain()
        .focus()
        .deleteRange({ from: pos + 1, to: pos + node.nodeSize - 1 })
        .insertContentAt(pos + 1, htmlContent)
        .run();

      const hunkMsg =
        searchReplaceBlocks.length > 0
          ? `Alteração cirúrgica aplicada (${searchReplaceBlocks.length} trecho(s))!`
          : blockType === 'blockquote'
          ? 'Callout atualizado com sucesso!'
          : blockType === 'blockquoteToggle'
          ? 'Destaque atualizado com sucesso!'
          : 'Toggle atualizado com sucesso!';

      triggerToast(hunkMsg, 'success');
    },
    [editor, getPos, node, blockType, updateAttributes, getRawBlockContent]
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
    originalContent: getRawBlockContent(),
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
