import { useState, useCallback } from 'react';
import { Editor } from '@tiptap/core';
import type { EditorView } from '@tiptap/pm/view';
import { triggerToast } from '../../ui/ToastContext';
import { platform } from '../../../services/platform';
import { getNotesKey } from '../../../store/useStore';
import { encryptAndSaveScrap } from '../../../services/scrap/scrap-storage';
import { captureWebScrap } from '../../../services/scrap/scrap-service';

export interface SlashMenuState {
  query: string;
  startPos: number;
  x: number;
  y: number;
}

interface UseSlashCommandProps {
  setPageSearchMenu: React.Dispatch<React.SetStateAction<{ isOpen: boolean, x: number, y: number, query: string, mode?: 'link' | 'create' } | null>>;
  setFocusModal: React.Dispatch<React.SetStateAction<{ isOpen: boolean, initialTime?: number, initialTag?: string, initialDesc?: string } | null>>;
  setAlarmModal: React.Dispatch<React.SetStateAction<{ isOpen: boolean, initialTimeStr?: string } | null>>;
  setFileUploadModal: React.Dispatch<React.SetStateAction<{ isOpen: boolean, isLink: boolean } | null>>;
  setFileSelectModal: React.Dispatch<React.SetStateAction<boolean>>;
  setCalendarEventModal: React.Dispatch<React.SetStateAction<{ isOpen: boolean, initialTitle?: string } | null>>;
  setMediaSelectModal: React.Dispatch<React.SetStateAction<{ isOpen: boolean, type: 'video' | 'book' } | null>>;
  setQuestionCreateModal: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Hook de controle do menu de comandos '/' (slash commands).
 */
export function useSlashCommand({
  setPageSearchMenu,
  setFocusModal,
  setAlarmModal,
  setFileUploadModal,
  setFileSelectModal,
  setCalendarEventModal,
  setMediaSelectModal,
  setQuestionCreateModal,
}: UseSlashCommandProps) {
  const [slashMenu, setSlashMenu] = useState<SlashMenuState | null>(null);

  const handleSlashKeyDown = useCallback((view: EditorView, event: KeyboardEvent) => {
    if (event.key === '/') {
      const startPos = view.state.selection.$head.pos;
      const coords = view.coordsAtPos(startPos);
      const x = coords.left;
      const y = coords.top + 24;
      setSlashMenu({ query: '', startPos, x, y });
      return false;
    }
    if (slashMenu) {
      if (event.key === 'Escape' || event.key === ' ') {
        setSlashMenu(null);
        if (event.key === ' ') return false;
        return true;
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        setSlashMenu(null);
        return false;
      }
      if (event.key === 'Backspace' && slashMenu.query.length === 0) {
        setSlashMenu(null);
        return false;
      }
      return false;
    }
    return false;
  }, [slashMenu]);

  const updateSlashMenuOnUpdate = useCallback((editor: Editor) => {
    setSlashMenu(prev => {
      try {
        const currentPos = editor.state.selection.$head.pos;
        if (prev) {
          if (currentPos <= prev.startPos) return null;
          const rawQuery = editor.state.doc.textBetween(prev.startPos, currentPos);
          const query = rawQuery.startsWith('/') ? rawQuery.substring(1) : rawQuery;
          if (query === prev.query) return prev;
          return { ...prev, query };
        } else {
          const { $head } = editor.state.selection;
          const textBefore = $head.parent.textBetween(0, $head.parentOffset);
          if (textBefore.endsWith(' /') || textBefore === '/') {
            const startPos = currentPos - 1;
            const coords = editor.view.coordsAtPos(startPos);
            return { query: '', startPos, x: coords.left, y: coords.top + 24 };
          }
          return null;
        }
      } catch (e) {
        return null;
      }
    });
  }, []);

  const executeSlashCommand = useCallback((commandId: string, editor: Editor | null) => {
    if (!editor || !slashMenu) return;
    
    try {
      const startPos = slashMenu.startPos;
      const endPos = startPos + slashMenu.query.length + 1; 
      
      setSlashMenu(null);
      
      const chain = editor.chain().focus().deleteRange({ from: startPos, to: endPos });

    switch (commandId) {
      case 'text': chain.setParagraph().run(); break;
      case 'h1': chain.toggleHeading({ level: 1 }).run(); break;
      case 'h2': chain.toggleHeading({ level: 2 }).run(); break;
      case 'h3': chain.toggleHeading({ level: 3 }).run(); break;
      case 'cols2':
      case '2colunas':
      case '2coluna':
      case '2cols':
      case '2':
        chain.insertContent({
          type: 'columnGroup',
          content: [
            { type: 'columnBlock', attrs: { width: 50 }, content: [{ type: 'paragraph' }] },
            { type: 'columnBlock', attrs: { width: 50 }, content: [{ type: 'paragraph' }] }
          ]
        }).focus(startPos + 2).run();
        break;
      case 'cols3':
      case '3colunas':
      case '3coluna':
      case '3cols':
      case '3':
        chain.insertContent({
          type: 'columnGroup',
          content: [
            { type: 'columnBlock', attrs: { width: 33.3 }, content: [{ type: 'paragraph' }] },
            { type: 'columnBlock', attrs: { width: 33.3 }, content: [{ type: 'paragraph' }] },
            { type: 'columnBlock', attrs: { width: 33.4 }, content: [{ type: 'paragraph' }] }
          ]
        }).focus(startPos + 2).run();
        break;
      case 'todo': chain.toggleTaskList().run(); break;
      case 'bullet': chain.toggleBulletList().run(); break;
      case 'callout': chain.toggleBlockquote().run(); break;
      case 'code': chain.insertContent({ type: 'codeBlock' }).run(); break;
      case 'group': chain.insertContent('<div class="group-collection"></div>').run(); break;
      case 'file': chain.run(); setFileSelectModal(true); break;
      case 'file-upload': chain.run(); setFileUploadModal({ isOpen: true, isLink: false }); break;
      case 'file-link': chain.run(); setFileUploadModal({ isOpen: true, isLink: true }); break;
      case 'video': chain.run(); setMediaSelectModal({ isOpen: true, type: 'video' }); break;
      case 'livro': chain.run(); setMediaSelectModal({ isOpen: true, type: 'book' }); break;
      case 'event': {
        const parts = (slashMenu.query || '').trim().split(' ');
        let initialTitle = '';
        
        if (parts[0] && parts[0].toLowerCase() === 'event') parts.shift();
        
        initialTitle = parts.join(' ');
        
        chain.run();
        setCalendarEventModal({ isOpen: true, initialTitle });
        break;
      }
      case 'question': chain.run(); setQuestionCreateModal(true); break;
      case 'toggle': chain.insertContent('<div class="toggle-block"><p></p></div>').run(); break;
      case 'blockquoteToggle': chain.insertContent('<div class="blockquote-toggle"><p></p></div>').run(); break;
      case 'page-create':
      case 'criar-pagina':
      case 'nova-pagina': {
        const queryText = slashMenu.query.replace(/^(page-create|criar-pagina|nova-pagina|criar|nova)\s*/i, '').trim();
        chain.run();
        setPageSearchMenu({
          isOpen: true,
          x: slashMenu.x,
          y: slashMenu.y,
          query: queryText,
          mode: 'create'
        });
        break;
      }
      case 'page':
      case 'page-link':
      case 'vincular-pagina': {
        const queryText = slashMenu.query.replace(/^(page-link|vincular-pagina|page|vincular|pagina)\s*/i, '').trim();
        chain.run();
        setPageSearchMenu({
          isOpen: true,
          x: slashMenu.x,
          y: slashMenu.y,
          query: queryText,
          mode: 'link'
        }); 
        break;
      }
      case 'divider': chain.setHorizontalRule().run(); break;
      case 'table': 
        chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        break;
      case 'table-week': 
        chain.insertTable({ rows: 4, cols: 7, withHeaderRow: true }).run();
        break;
      case 'table-day': 
        chain.insertTable({ rows: 8, cols: 2, withHeaderRow: true }).run();
        break;
      case 'table-habit': 
        chain.insertTable({ rows: 5, cols: 8, withHeaderRow: true }).run();
        break;
      case 'foco': {
        const parts = (slashMenu.query || '').trim().split(' ');
        let initialTime = 30;
        let initialTag = '';
        let initialDesc = '';
        
        parts.shift();
        if (parts[0] && parts[0].toLowerCase() === 'foco') parts.shift();
        
        for (const p of parts) {
          if (!isNaN(Number(p)) && Number(p) > 0) {
            initialTime = Number(p);
          } else if (p.startsWith('#')) {
            initialTag = p.substring(1);
          } else {
            initialDesc += (initialDesc ? ' ' : '') + p;
          }
        }
        
        chain.run();
        setFocusModal({ isOpen: true, initialTime, initialTag, initialDesc });
        break;
      }
      case 'alarme': {
        const parts = (slashMenu.query || '').trim().split(' ');
        let initialTimeStr = '12:00';
        
        if (parts[0] && parts[0].toLowerCase() === 'alarme') parts.shift();
        
        for (const p of parts) {
          if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(p)) {
            initialTimeStr = p.padStart(5, '0');
          }
        }
        
        chain.run();
        setAlarmModal({ isOpen: true, initialTimeStr });
        break;
      }
      case 'scrap': {
        const rawQuery = (slashMenu.query || '').trim();
        let targetUrl = rawQuery.replace(/^(scrap|snapshot|web|capturar)\s*/i, '').trim();

        chain.run();

        const triggerCapture = (urlToScrap: string) => {
          let cleanUrl = urlToScrap.trim();
          if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
            if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(cleanUrl)) {
              cleanUrl = 'https://' + cleanUrl;
            } else {
              triggerToast('URL inválida. Informe um endereço como https://site.com', 'error');
              return;
            }
          }

          const tempId = 'scrap_temp_' + Math.random().toString(36).substring(2, 9);
          editor
            .chain()
            .focus()
            .insertContent({
              type: 'scrapWidget',
              attrs: {
                id: tempId,
                url: cleanUrl,
                status: 'capturing',
                created_at: new Date().toISOString(),
              },
            })
            .run();

          // Disparar captura assíncrona
          (async () => {
            try {
              if (platform.platform === 'desktop') {
                const payload = await captureWebScrap(cleanUrl);
                const masterKey = getNotesKey();
                const saveResult = await encryptAndSaveScrap(payload.id, payload.html_content, payload.local_path, masterKey);

                // Atualizar os atributos do nó no editor
                if (editor.isDestroyed) return;
                editor.commands.command(({ tr, state }) => {
                  let found = false;
                  state.doc.descendants((node, pos) => {
                    if (node.type.name === 'scrapWidget' && (node.attrs.id === tempId || node.attrs.url === cleanUrl)) {
                      tr.setNodeMarkup(pos, undefined, {
                        ...node.attrs,
                        id: payload.id,
                        url: payload.url,
                        title: payload.title,
                        favicon: payload.favicon,
                        local_path: payload.local_path,
                        drive_file_id: saveResult.driveFileId,
                        file_size: payload.file_size,
                        status: saveResult.isSynced ? 'ready' : 'sync_pending',
                        created_at: payload.created_at,
                        error_reason: null,
                      });
                      found = true;
                      return false;
                    }
                    return true;
                  });
                  return found;
                });

                triggerToast('Página capturada e salva com sucesso!', 'success');
              } else {
                if (editor.isDestroyed) return;
                editor.commands.command(({ tr, state }) => {
                  state.doc.descendants((node, pos) => {
                    if (node.type.name === 'scrapWidget' && (node.attrs.id === tempId || node.attrs.url === cleanUrl)) {
                      tr.setNodeMarkup(pos, undefined, {
                        ...node.attrs,
                        status: 'error',
                        error_reason: 'A captura de snapshots está disponível na versão Desktop.',
                      });
                      return false;
                    }
                    return true;
                  });
                  return true;
                });
              }
            } catch (err: unknown) {
              console.error('[SlashCommand] Erro ao capturar snapshot:', err);
              const msg = err instanceof Error ? err.message : String(err) || 'Falha ao conectar e baixar o conteúdo da página.';
              if (editor.isDestroyed) return;
              editor.commands.command(({ tr, state }) => {
                state.doc.descendants((node, pos) => {
                  if (node.type.name === 'scrapWidget' && (node.attrs.id === tempId || node.attrs.url === cleanUrl)) {
                    tr.setNodeMarkup(pos, undefined, {
                      ...node.attrs,
                      status: 'error',
                      error_reason: msg,
                    });
                    return false;
                  }
                  return true;
                });
                return true;
              });
              triggerToast(`Falha no scrap: ${msg}`, 'error');
            }
          })();
        };

        if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://') || /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(targetUrl))) {
          triggerCapture(targetUrl);
        } else {
          // Abre o ScrapInputModal moderno com campo de digitação/colagem
          window.dispatchEvent(
            new CustomEvent('caderno-open-scrap-input', {
              detail: {
                initialUrl: targetUrl,
                onConfirm: (url: string) => {
                  triggerCapture(url);
                },
              },
            })
          );
        }

        break;
      }
      case 'documento': {
        chain.run();
        setFileUploadModal({ isOpen: true, isLink: false });
        break;
      }
      case 'documento-link': {
        chain.run();
        setFileSelectModal(true);
        break;
      }
      case 'evento': {
        const parts = (slashMenu.query || '').trim().split(' ');
        if (parts[0] && parts[0].toLowerCase() === 'evento') parts.shift();
        const initialTitle = parts.join(' ').trim() || '';
        chain.run();
        setCalendarEventModal({ isOpen: true, initialTitle });
        break;
      }
    }
    } catch (err) {
      console.error('[SlashCommand] Erro ao executar comando do menu rápido:', err);
      triggerToast('Falha ao inserir elemento do menu rápido.', 'error');
    }
  }, [
    slashMenu,
    setPageSearchMenu,
    setFocusModal,
    setAlarmModal,
    setFileUploadModal,
    setFileSelectModal,
    setCalendarEventModal,
    setMediaSelectModal,
  ]);

  return { slashMenu, setSlashMenu, handleSlashKeyDown, updateSlashMenuOnUpdate, executeSlashCommand };
}
