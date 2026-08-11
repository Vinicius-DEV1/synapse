import { useState, useCallback } from 'react';
import { Editor } from '@tiptap/core';

export interface SlashMenuState {
  query: string;
  startPos: number;
  x: number;
  y: number;
}

interface UseSlashCommandProps {
  setPageSearchMenu: React.Dispatch<React.SetStateAction<{ isOpen: boolean, x: number, y: number, query: string } | null>>;
  setFocusModal: React.Dispatch<React.SetStateAction<{ isOpen: boolean, initialTime?: number, initialTag?: string, initialDesc?: string } | null>>;
  setAlarmModal: React.Dispatch<React.SetStateAction<{ isOpen: boolean, initialTimeStr?: string } | null>>;
  setFileUploadModal: React.Dispatch<React.SetStateAction<{ isOpen: boolean, isLink: boolean } | null>>;
  setFileSelectModal: React.Dispatch<React.SetStateAction<boolean>>;
  setCalendarEventModal: React.Dispatch<React.SetStateAction<{ isOpen: boolean, initialTitle?: string } | null>>;
  setMediaSelectModal: React.Dispatch<React.SetStateAction<{ isOpen: boolean, type: 'video' | 'book' } | null>>;
}

export function useSlashCommand({
  setPageSearchMenu,
  setFocusModal,
  setAlarmModal,
  setFileUploadModal,
  setFileSelectModal,
  setCalendarEventModal,
  setMediaSelectModal
}: UseSlashCommandProps) {
  const [slashMenu, setSlashMenu] = useState<SlashMenuState | null>(null);

  const handleSlashKeyDown = useCallback((view: any, event: KeyboardEvent) => {
    if (event.key === '/') {
      const startPos = view.state.selection.$head.pos;
      const coords = view.coordsAtPos(startPos);
      const x = coords.left;
      const y = coords.top + 24; // 24px below cursor
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
        return false; // let the cursor move
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
          if (currentPos <= prev.startPos) return null; // fechou o menu apagando a barra
          const rawQuery = editor.state.doc.textBetween(prev.startPos, currentPos);
          const query = rawQuery.startsWith('/') ? rawQuery.substring(1) : rawQuery;
          const coords = editor.view.coordsAtPos(prev.startPos);
          return { ...prev, query, x: coords.left, y: coords.top + 24 };
        } else {
          // Mobile fallback: Check if user just typed a slash
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
    
    const startPos = slashMenu.startPos;
    const endPos = startPos + slashMenu.query.length + 1; 
    
    setSlashMenu(null);
    
    const chain = editor.chain().focus().deleteRange({ from: startPos, to: endPos });

    switch (commandId) {
      case 'text': chain.setParagraph().run(); break;
      case 'h1': chain.toggleHeading({ level: 1 }).run(); break;
      case 'h2': chain.toggleHeading({ level: 2 }).run(); break;
      case 'h3': chain.toggleHeading({ level: 3 }).run(); break;
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
        const parts = slashMenu.query.trim().split(' ');
        let initialTitle = '';
        
        if (parts[0] && parts[0].toLowerCase() === 'event') parts.shift();
        
        initialTitle = parts.join(' ');
        
        chain.run();
        setCalendarEventModal({ isOpen: true, initialTitle });
        break;
      }
      case 'question': chain.insertContent('<div class="question-block"></div>').run(); break;
      case 'toggle': chain.insertContent('<div class="toggle-block"><p></p></div>').run(); break;
      case 'blockquoteToggle': chain.insertContent('<div class="blockquote-toggle"><p></p></div>').run(); break;
      case 'page': 
        chain.run();
        setPageSearchMenu({ isOpen: true, x: slashMenu.x, y: slashMenu.y, query: slashMenu.query.replace(/^page\s*/i, '') }); 
        break;
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
        const parts = slashMenu.query.trim().split(' ');
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
        const parts = slashMenu.query.trim().split(' ');
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
        const parts = slashMenu.query.trim().split(' ');
        if (parts[0] && parts[0].toLowerCase() === 'evento') parts.shift();
        const initialTitle = parts.join(' ').trim() || '';
        chain.run();
        setCalendarEventModal({ isOpen: true, initialTitle });
        break;
      }
    }
  }, [slashMenu, setPageSearchMenu, setFocusModal, setAlarmModal, setFileUploadModal, setFileSelectModal]);

  return { slashMenu, setSlashMenu, handleSlashKeyDown, updateSlashMenuOnUpdate, executeSlashCommand };
}
