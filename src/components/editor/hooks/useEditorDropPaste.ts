import { useCallback } from 'react';
import type { Editor } from '@tiptap/core';
import type { EditorView } from '@tiptap/pm/view';
import { NodeSelection } from '@tiptap/pm/state';
import { uploadEncryptedImage, setCachedImage } from '../../../services/image-drive';
import { applyGroupDrop, consumeGroupDropTarget } from '../../editor-extensions/group-layout';
import { findNodePos } from '../../editor-extensions/image/imageUtils';
import { triggerToast } from '../../ui/ToastContext';

interface UseEditorDropPasteProps {
  editor: Editor | null;
  masterKey?: CryptoKey | null;
  viewerState: {
    isOpen: boolean;
    src: string;
    nodePos: number | null;
    nodeType: string | null;
  };
  setViewerState: React.Dispatch<
    React.SetStateAction<{
      isOpen: boolean;
      src: string;
      nodePos: number | null;
      nodeType: string | null;
    }>
  >;
}

/**
 * Hook que gerencia o fluxo de colagem (paste) e soltura (drop) de arquivos e imagens no editor.
 */
export function useEditorDropPaste({
  editor,
  masterKey,
  viewerState,
  setViewerState,
}: UseEditorDropPasteProps) {
  const handlePaste = useCallback(
    (view: EditorView, event: ClipboardEvent) => {
      try {
        if (!editor) return false;

        const textPasted = event.clipboardData?.getData('text/plain');
        if (textPasted) {
          const urlStr = textPasted.trim();
          let isUrl = false;
          try {
            new URL(urlStr);
            isUrl = urlStr.startsWith('http');
          } catch {
            isUrl = false;
          }

          if (isUrl && view.state.selection.empty) {
            editor.chain().focus().insertContent({
              type: 'linkPreview',
              attrs: { url: urlStr, isLoading: true },
            }).run();
            event.preventDefault();
            return true;
          }
        }

        const items = Array.from(event.clipboardData?.items || []);
        let imagePasted = false;
        const nodesToInsert: any[] = [];
        const readers: Promise<{ src: string }>[] = [];

        for (const item of items) {
          if (item.type.indexOf('image') === 0) {
            imagePasted = true;
            const file = item.getAsFile();
            if (file) {
              if (masterKey) {
                const tempId =
                  'uploading_' + Date.now() + Math.random().toString(36).substring(2, 6);
                if (!window.__pendingImageUploads) {
                  window.__pendingImageUploads = new Map();
                }
                window.__pendingImageUploads.set(tempId, file);
                file
                  .arrayBuffer()
                  .then((buffer) => {
                    setCachedImage(tempId, buffer, file.type).catch(console.error);
                  })
                  .catch((err) => {
                    console.error('[Editor] Erro ao fazer buffer da imagem colada:', err);
                    triggerToast('Falha ao processar imagem para criptografia.', 'error');
                  });

                nodesToInsert.push({
                  type: 'encryptedImage',
                  attrs: { driveFileId: tempId },
                });
              } else {
                if (file.size > 2 * 1024 * 1024) {
                  triggerToast(
                    'Imagem muito grande para colar sem criptografia (limite 2MB). Reduza o tamanho ou conecte o cofre.',
                    'error'
                  );
                  continue;
                }
                readers.push(
                  new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) =>
                      resolve({ src: e.target?.result as string });
                    reader.onerror = () => {
                      triggerToast('Erro ao ler arquivo de imagem.', 'error');
                      resolve({ src: '' });
                    };
                    reader.readAsDataURL(file);
                  })
                );
              }
            }
          }
        }

        if (imagePasted) {
          const { selection } = view.state;
          const isNodeSelected = selection instanceof NodeSelection;
          const insertPos = isNodeSelected ? selection.to : null;

          const insertPastedNodes = (nodes: any[]) => {
            if (nodes.length === 0) return;
            try {
              if (insertPos !== null) {
                editor.chain().insertContentAt(insertPos, nodes).focus().run();
              } else {
                editor.chain().focus().insertContent(nodes).run();
              }
            } catch (err) {
              console.error('[Editor] Erro ao inserir nós de imagem:', err);
              triggerToast('Não foi possível inserir a imagem no documento.', 'error');
            }
          };

          if (masterKey && nodesToInsert.length > 0) {
            insertPastedNodes(nodesToInsert);
          } else if (readers.length > 0) {
            Promise.all(readers).then((results) => {
              const validResults = results.filter((r) => r.src);
              if (editor && validResults.length > 0) {
                insertPastedNodes(
                  validResults.map((r) => ({ type: 'image', attrs: { src: r.src } }))
                );
              }
            });
          }
          event.preventDefault();
          return true;
        }
      } catch (err) {
        console.error('[Editor] Erro inesperado ao colar:', err);
        triggerToast('Erro ao colar conteúdo no editor.', 'error');
      }

      return false;
    },
    [editor, masterKey]
  );

  const handleDrop = useCallback(
    (view: EditorView, event: DragEvent, _slice: any, moved: boolean) => {
      try {
        if (
          !moved &&
          event.dataTransfer &&
          event.dataTransfer.files &&
          event.dataTransfer.files.length > 0
        ) {
          const files = Array.from(event.dataTransfer.files);
          let imageDropped = false;

          const nodesToInsert: any[] = [];
          const readers: Promise<{ src: string }>[] = [];
          const coordinates = view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          });
          const pos = coordinates ? coordinates.pos : undefined;

          for (const file of files) {
            if (file.type.indexOf('image') === 0) {
              imageDropped = true;
              if (editor) {
                if (masterKey) {
                  const tempId =
                    'uploading_' +
                    Date.now() +
                    Math.random().toString(36).substring(2, 6);
                  if (!window.__pendingImageUploads) {
                    window.__pendingImageUploads = new Map();
                  }
                  window.__pendingImageUploads.set(tempId, file);
                  file
                    .arrayBuffer()
                    .then((buffer) => {
                      setCachedImage(tempId, buffer, file.type).catch(console.error);
                    })
                    .catch((err) => {
                      console.error('[Editor] Erro ao carregar buffer de imagem solta:', err);
                      triggerToast('Falha ao processar arquivo para o cofre.', 'error');
                    });

                  nodesToInsert.push({
                    type: 'encryptedImage',
                    attrs: { driveFileId: tempId },
                  });
                } else {
                  if (file.size > 2 * 1024 * 1024) {
                    triggerToast(
                      'Imagem muito grande para soltar sem criptografia (limite 2MB).',
                      'error'
                    );
                    continue;
                  }
                  readers.push(
                    new Promise((resolve) => {
                      const reader = new FileReader();
                      reader.onload = (e) =>
                        resolve({ src: e.target?.result as string });
                      reader.onerror = () => {
                        triggerToast('Falha ao ler arquivo de imagem arrastado.', 'error');
                        resolve({ src: '' });
                      };
                      reader.readAsDataURL(file);
                    })
                  );
                }
              }
            }
          }

          if (imageDropped) {
            const columnTarget = consumeGroupDropTarget(view, {
              x: event.clientX,
              y: event.clientY,
            });

            const insertNodes = (nodes: any[]) => {
              if (!editor || nodes.length === 0) return;

              try {
                if (columnTarget) {
                  const pmNodes = nodes.map((n) => editor.schema.nodeFromJSON(n));
                  if (applyGroupDrop(editor.view, columnTarget, pmNodes)) return;
                }

                if (pos !== undefined) {
                  editor.chain().insertContentAt(pos, nodes).focus().run();
                } else {
                  editor.chain().focus().insertContent(nodes).run();
                }
              } catch (err) {
                console.error('[Editor] Erro ao posicionar imagem no documento:', err);
                triggerToast('Não foi possível inserir a imagem na posição indicada.', 'error');
              }
            };

            if (masterKey && nodesToInsert.length > 0) {
              insertNodes(nodesToInsert);
            } else if (readers.length > 0) {
              Promise.all(readers).then((results) => {
                const validResults = results.filter((r) => r.src);
                if (validResults.length > 0) {
                  insertNodes(
                    validResults.map((r) => ({ type: 'image', attrs: { src: r.src } }))
                  );
                }
              });
            }
            event.preventDefault();
            return true;
          }
        }
      } catch (err) {
        console.error('[Editor] Erro inesperado no manipulador de drop:', err);
        triggerToast('Erro ao soltar arquivo no editor.', 'error');
      }
      return false;
    },
    [editor, masterKey]
  );

  const handleCroppedImage = useCallback(
    async (croppedDataUrl: string) => {
      if (!editor || viewerState.nodePos === null) {
        setViewerState({ isOpen: false, src: '', nodePos: null, nodeType: null });
        return;
      }

      const pos = viewerState.nodePos;
      const node = editor.state.doc.nodeAt(pos);
      setViewerState({ isOpen: false, src: '', nodePos: null, nodeType: null });
      if (!node) return;

      try {
        if (node.type.name === 'encryptedImage') {
          if (!masterKey) {
            triggerToast('Desbloqueie o cofre de notas para salvar o recorte.', 'error');
            return;
          }
          const blob = await (await fetch(croppedDataUrl)).blob();
          const file = new File([blob], 'imagem-recortada.jpg', {
            type: blob.type || 'image/jpeg',
          });
          const driveFileId = await uploadEncryptedImage(file, masterKey);

          const currentPos = findNodePos(editor.state.doc, node, pos);
          if (currentPos === null) return;
          editor.view.dispatch(
            editor.state.tr.setNodeMarkup(currentPos, undefined, {
              ...node.attrs,
              driveFileId,
              width: null,
              height: null,
            })
          );
          triggerToast('Recorte salvo no cofre com sucesso!', 'success');
        } else {
          const currentPos = findNodePos(editor.state.doc, node, pos);
          if (currentPos === null) return;
          editor.view.dispatch(
            editor.state.tr.setNodeMarkup(currentPos, undefined, {
              ...node.attrs,
              src: croppedDataUrl,
              width: null,
              height: null,
            })
          );
          triggerToast('Recorte de imagem aplicado!', 'success');
        }
      } catch (err) {
        console.error('[Editor] Falha ao salvar o recorte da imagem:', err);
        triggerToast('Não foi possível salvar o recorte da imagem.', 'error');
      }
    },
    [editor, viewerState.nodePos, masterKey, setViewerState]
  );

  return { handlePaste, handleDrop, handleCroppedImage };
}
