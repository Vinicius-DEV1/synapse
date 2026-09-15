import { useCallback } from 'react';
import type { Editor } from '@tiptap/core';
import type { EditorView } from '@tiptap/pm/view';
import { NodeSelection } from '@tiptap/pm/state';
import { uploadEncryptedImage, setCachedImage } from '../../../services/image-drive';
import { applyGroupDrop, consumeGroupDropTarget } from '../../editor-extensions/group-layout';
import { findNodePos } from '../../editor-extensions/image/imageUtils';
import { triggerToast } from '../../ui/ToastContext';
import { isDesktopApp } from '../../../services/platform';
import {
  extractImageFilesFromClipboard,
  extractLocalImagePaths,
  readLocalImageAsFile,
  isImageFilePath,
} from '../utils/clipboardMediaUtils';
import { getLinkEntitySync, touchLinkEntity } from '../../../services/link-vault/linkVaultService';

function registerPendingUpload(tempId: string, file: File) {
  if (!window.__pendingImageUploads) {
    window.__pendingImageUploads = new Map();
  }
  window.__pendingImageUploads.set(tempId, file);
  // Auto-cleanup after 5 minutes to prevent memory leak
  setTimeout(() => {
    window.__pendingImageUploads?.delete(tempId);
  }, 5 * 60 * 1000);
}

interface EditorImageNodeJSON {
  type: 'encryptedImage' | 'image';
  attrs: {
    driveFileId?: string;
    src?: string;
  };
}

function insertImageFilesIntoEditor({
  files,
  currentEditor,
  masterKey,
  insertPos,
}: {
  files: File[];
  currentEditor: Editor;
  masterKey?: CryptoKey | null;
  insertPos?: number | null;
}) {
  if (files.length === 0) return;

  const nodesToInsert: EditorImageNodeJSON[] = [];
  const readers: Promise<{ src: string }>[] = [];

  for (const file of files) {
    if (masterKey) {
      const tempId = 'uploading_' + Date.now() + Math.random().toString(36).substring(2, 6);
      registerPendingUpload(tempId, file);
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
          reader.onload = (e) => resolve({ src: (e.target?.result as string) || '' });
          reader.onerror = () => {
            triggerToast('Erro ao ler arquivo de imagem.', 'error');
            resolve({ src: '' });
          };
          reader.readAsDataURL(file);
        })
      );
    }
  }

  const dispatchInsert = (nodes: EditorImageNodeJSON[]) => {
    if (nodes.length === 0) return;
    try {
      if (insertPos !== null && insertPos !== undefined) {
        currentEditor.chain().insertContentAt(insertPos, nodes).focus().run();
      } else {
        currentEditor.chain().focus().insertContent(nodes).run();
      }
    } catch (err) {
      console.error('[Editor] Erro ao inserir nós de imagem:', err);
      triggerToast('Não foi possível inserir a imagem no documento.', 'error');
    }
  };

  if (masterKey && nodesToInsert.length > 0) {
    dispatchInsert(nodesToInsert);
  } else if (readers.length > 0) {
    Promise.all(readers).then((results) => {
      const validResults = results.filter((r) => r.src);
      if (validResults.length > 0) {
        dispatchInsert(
          validResults.map((r) => ({ type: 'image', attrs: { src: r.src } }))
        );
      }
    });
  }
}

interface UseEditorDropPasteProps {
  editor?: Editor | null;
  editorRef?: React.RefObject<Editor | null>;
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
  editorRef,
  masterKey,
  viewerState,
  setViewerState,
}: UseEditorDropPasteProps) {
  const getEditor = useCallback(() => editorRef?.current ?? editor ?? null, [editor, editorRef]);

  const handlePaste = useCallback(
    (view: EditorView, event: ClipboardEvent) => {
      try {
        const currentEditor = getEditor();
        if (!currentEditor) return false;

        // 1. Se estiver dentro de um bloco de código (codeBlock) ou elemento code,
        // não interceptar a colagem para permitir que o link seja colado como texto puro
        const isInsideCodeBlock =
          (typeof currentEditor?.isActive === 'function' &&
            (currentEditor.isActive('codeBlock') || currentEditor.isActive('code'))) ||
          view.state.selection.$from?.parent?.type?.name === 'codeBlock' ||
          !!view.state.selection.$from?.parent?.type?.spec?.code;

        // 2. Se o usuário colou com Shift pressionado (Ctrl+Shift+V / Shift+Paste),
        // permitir a colagem de texto puro nativo sem criar widget
        const isShiftPaste = !!(event as unknown as { shiftKey?: boolean })?.shiftKey;

        if (isInsideCodeBlock || isShiftPaste) {
          return false;
        }

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
            if (isImageFilePath(urlStr)) {
              currentEditor.chain().focus().insertContent({
                type: 'image',
                attrs: { src: urlStr },
              }).run();
              event.preventDefault();
              return true;
            }

            const cached = getLinkEntitySync(urlStr);
            if (cached) {
              touchLinkEntity(urlStr).catch(() => {});
            }

            currentEditor.chain().focus().insertContent({
              type: 'linkPreview',
              attrs: {
                url: urlStr,
                isLoading: !cached?.title,
                title: cached?.title ?? null,
                channel: cached?.channel ?? null,
                notes: cached?.notes ?? '',
                color: cached?.color ?? 'default',
                watched: cached?.watched ?? false,
                watching: cached?.watching ?? false,
                scrapId: cached?.scrapId ?? null,
                scrapStatus: cached?.scrapStatus ?? null,
                scrapLocalPath: cached?.scrapLocalPath ?? null,
                scrapDriveFileId: cached?.scrapDriveFileId ?? null,
                scrapFileSize: cached?.scrapFileSize ?? null,
                scrapCreatedAt: cached?.scrapCreatedAt ?? null,
              },
            }).run();
            event.preventDefault();
            return true;
          }
        }

        // 3. Imagens diretas no clipboard (prints de tela, cópias do navegador, blobs de imagem)
        const directImageFiles = extractImageFilesFromClipboard(event);
        if (directImageFiles.length > 0) {
          const { selection } = view.state;
          const isNodeSelected = selection instanceof NodeSelection;
          const insertPos = isNodeSelected ? selection.to : null;

          insertImageFilesIntoEditor({
            files: directImageFiles,
            currentEditor,
            masterKey,
            insertPos,
          });

          event.preventDefault();
          return true;
        }

        // 4. Se não há arquivos diretos no clipboard, verificar se é um caminho local de imagem
        // (comum no Linux com GNOME Loupe / Nautilus, macOS Finder ou Windows Explorer)
        if (isDesktopApp()) {
          const uriList = event.clipboardData?.getData('text/uri-list') || '';
          const candidateText = `${uriList}\n${textPasted || ''}`;
          const localImagePaths = extractLocalImagePaths(candidateText);

          if (localImagePaths.length > 0) {
            const { selection } = view.state;
            const isNodeSelected = selection instanceof NodeSelection;
            const insertPos = isNodeSelected ? selection.to : null;

            event.preventDefault();

            Promise.all(localImagePaths.map((path) => readLocalImageAsFile(path)))
              .then((loadedFiles) => {
                const validFiles = loadedFiles.filter((f): f is File => f !== null);
                if (validFiles.length > 0) {
                  insertImageFilesIntoEditor({
                    files: validFiles,
                    currentEditor,
                    masterKey,
                    insertPos,
                  });
                } else {
                  triggerToast('Não foi possível carregar a imagem a partir do caminho copiado.', 'error');
                }
              })
              .catch((err) => {
                console.error('[Editor] Erro ao resolver caminhos locais colados:', err);
                triggerToast('Falha ao processar arquivo de imagem local.', 'error');
              });

            return true;
          }
        }
      } catch (err) {
        console.error('[Editor] Erro inesperado ao colar:', err);
        triggerToast('Erro ao colar conteúdo no editor.', 'error');
      }

      return false;
    },
    [getEditor, masterKey]
  );

  const handleDrop = useCallback(
    (view: EditorView, event: DragEvent, _slice: unknown, moved: boolean) => {
      try {
        const currentEditor = getEditor();
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
              if (currentEditor) {
                if (masterKey) {
                  const tempId =
                    'uploading_' +
                    Date.now() +
                    Math.random().toString(36).substring(2, 6);
                  registerPendingUpload(tempId, file);
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

          const nonImageFiles = files.filter(f => f.type.indexOf('image') !== 0);
          if (nonImageFiles.length > 0) {
            window.dispatchEvent(new CustomEvent('caderno-drop-files', { 
              detail: { files: nonImageFiles } 
            }));
            
            // Se apenas soltou arquivos não-imagem, podemos retornar true
            if (files.length === nonImageFiles.length) {
              event.preventDefault();
              return true;
            }
          }

          if (imageDropped) {
            const columnTarget = consumeGroupDropTarget(view, {
              x: event.clientX,
              y: event.clientY,
            });

            const insertNodes = (nodes: any[]) => {
              if (!currentEditor || nodes.length === 0) return;

              try {
                if (columnTarget) {
                  const pmNodes = nodes.map((n) => currentEditor.schema.nodeFromJSON(n));
                  if (applyGroupDrop(currentEditor.view, columnTarget, pmNodes)) return;
                }

                if (pos !== undefined) {
                  currentEditor.chain().insertContentAt(pos, nodes).focus().run();
                } else {
                  currentEditor.chain().focus().insertContent(nodes).run();
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
                if (currentEditor && validResults.length > 0) {
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
    [getEditor, masterKey]
  );

  const handleCroppedImage = useCallback(
    async (croppedDataUrl: string) => {
      const currentEditor = getEditor();
      if (!currentEditor || viewerState.nodePos === null) {
        setViewerState({ isOpen: false, src: '', nodePos: null, nodeType: null });
        return;
      }

      const pos = viewerState.nodePos;
      const node = currentEditor.state.doc.nodeAt(pos);
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

          const currentPos = findNodePos(currentEditor.state.doc, node, pos);
          if (currentPos === null) return;
          currentEditor.view.dispatch(
            currentEditor.state.tr.setNodeMarkup(currentPos, undefined, {
              ...node.attrs,
              driveFileId,
              width: null,
              height: null,
            })
          );
          triggerToast('Recorte salvo no cofre com sucesso!', 'success');
        } else {
          const currentPos = findNodePos(currentEditor.state.doc, node, pos);
          if (currentPos === null) return;
          currentEditor.view.dispatch(
            currentEditor.state.tr.setNodeMarkup(currentPos, undefined, {
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
    [getEditor, viewerState.nodePos, masterKey, setViewerState]
  );

  return { handlePaste, handleDrop, handleCroppedImage };
}
