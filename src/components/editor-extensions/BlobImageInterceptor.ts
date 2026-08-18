/**
 * BlobImageInterceptor.ts
 * 
 * Plugin ProseMirror que intercepta QUALQUER node 'image' com src="blob:..." 
 * e o converte automaticamente para 'encryptedImage'.
 * 
 * Isso resolve o problema no Linux/WebKitGTK onde o handlePaste do editorProps
 * não é chamado para imagens coladas — o browser insere <img src="blob:...">
 * diretamente. Este plugin captura esse caso (e qualquer outro) e faz a 
 * conversão automática, funcionando em todas as plataformas.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { setCachedImage } from '../../services/image-drive';

const blobInterceptorKey = new PluginKey('blobImageInterceptor');

// Rastreia blobs já em processamento para não duplicar
const processingBlobs = new Set<string>();

export const BlobImageInterceptor = Extension.create({
  name: 'blobImageInterceptor',

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: blobInterceptorKey,

        // Observa cada transação e procura por nodes 'image' com blob: URLs
        appendTransaction(transactions, _oldState, newState) {
          // Só processa se houve mudanças no documento
          const docChanged = transactions.some(tr => tr.docChanged);
          if (!docChanged) return null;

          // Procura por nodes image com blob: URLs
          newState.doc.descendants((node, pos) => {
            if (
              node.type.name === 'image' &&
              node.attrs.src &&
              typeof node.attrs.src === 'string' &&
              node.attrs.src.startsWith('blob:') &&
              !processingBlobs.has(node.attrs.src)
            ) {
              const blobUrl = node.attrs.src;
              processingBlobs.add(blobUrl);

              console.log(`[BlobInterceptor] Detectado <img src="blob:...">. Iniciando conversão assíncrona...`);

              // Processo assíncrono: busca o blob PRIMEIRO, depois substitui o node
              convertBlobToEncryptedImage(editor, blobUrl, pos, node.attrs).finally(() => {
                processingBlobs.delete(blobUrl);
              });
            }
          });

          // Não altera a transação atual — a substituição será feita assincronamente
          return null;
        },
      }),
    ];
  },
});

/**
 * Busca os dados do blob, salva no cache, e só então substitui o node no editor.
 */
async function convertBlobToEncryptedImage(
  editor: any,
  blobUrl: string,
  _originalPos: number,
  attrs: Record<string, any>
) {
  try {
    // 1. Fetch o blob enquanto ele ainda está vivo na memória
    const res = await fetch(blobUrl);
    const blob = await res.blob();
    const file = new File([blob], 'pasted-image.png', { type: blob.type || 'image/png' });
    const buffer = await file.arrayBuffer();

    // 2. Gera o tempId
    const tempId = 'uploading_' + Date.now() + Math.random().toString(36).substring(2, 6);

    // 3. Salva no pendingUploads e no cache ANTES de criar o node
    if (!window.__pendingImageUploads) {
      window.__pendingImageUploads = new Map();
    }
    window.__pendingImageUploads.set(tempId, file);
    await setCachedImage(tempId, buffer, file.type);

    console.log(`[BlobInterceptor] Blob salvo no cache. tempId="${tempId}" (${buffer.byteLength} bytes). Substituindo node...`);

    // 4. Agora procura TODOS os nodes image com esse blob URL no documento atual
    // (a posição pode ter mudado). Pode haver mais de um: o usuário pode ter
    // duplicado/colado de novo o mesmo node 'image' enquanto o upload ainda
    // estava em voo — um único blobUrl processado (ver `processingBlobs`) não
    // significa um único node com esse src. Substituir só o primeiro deixava
    // os demais presos como <img src="blob:...">, que quebra assim que o
    // browser revoga o blob.
    const foundPositions: number[] = [];
    editor.state.doc.descendants((node: any, pos: number) => {
      if (node.type.name === 'image' && node.attrs.src === blobUrl) {
        foundPositions.push(pos);
      }
    });

    if (foundPositions.length === 0) {
      console.warn(`[BlobInterceptor] Node image com blob URL não encontrado mais. Pode já ter sido convertido.`);
      return;
    }

    // 5. Substitui cada node image pelo encryptedImage usando a API do editor
    const { tr } = editor.state;
    const encryptedImageType = editor.state.schema.nodes.encryptedImage;

    if (!encryptedImageType) {
      console.error('[BlobInterceptor] Node type "encryptedImage" não encontrado no schema!');
      return;
    }

    // De trás para frente: substituir da esquerda para a direita invalidaria as
    // posições já coletadas à direita (o tamanho do node muda na substituição).
    let replaced = 0;
    for (const pos of foundPositions.slice().reverse()) {
      const mappedPos = tr.mapping.map(pos, -1);
      const node = tr.doc.nodeAt(mappedPos);
      if (!node || node.type.name !== 'image' || node.attrs.src !== blobUrl) continue;
      const newNode = encryptedImageType.create({
        driveFileId: tempId,
        width: attrs.width,
        height: attrs.height,
      });
      tr.replaceWith(mappedPos, mappedPos + node.nodeSize, newNode);
      replaced += 1;
    }

    if (replaced > 0) {
      editor.view.dispatch(tr);
      console.log(`[BlobInterceptor] ${replaced} node(s) substituído(s) com sucesso! encryptedImage com tempId="${tempId}"`);
    }
  } catch (err) {
    console.error('[BlobInterceptor] Erro ao converter blob:', err);
  }
}
