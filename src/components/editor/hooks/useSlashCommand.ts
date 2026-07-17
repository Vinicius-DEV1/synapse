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
}

export function useSlashCommand({
  setPageSearchMenu,
  setFocusModal,
  setAlarmModal,
  setFileUploadModal,
  setFileSelectModal
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
    editor.commands.deleteRange({ from: startPos, to: endPos });

    switch (commandId) {
      case 'text': editor.commands.setParagraph(); break;
      case 'h1': editor.commands.toggleHeading({ level: 1 }); break;
      case 'h2': editor.commands.toggleHeading({ level: 2 }); break;
      case 'h3': editor.commands.toggleHeading({ level: 3 }); break;
      case 'todo': editor.commands.toggleTaskList(); break;
      case 'bullet': editor.commands.toggleBulletList(); break;
      case 'callout': editor.commands.toggleBlockquote(); break;
      case 'code': editor.commands.toggleCodeBlock(); break;
      case 'group': editor.commands.insertContent('<div class="group-collection"></div>'); break;
      case 'question': editor.commands.insertContent('<div class="question-block"></div>'); break;
      case 'toggle': editor.commands.insertContent('<div class="toggle-block"><p></p></div>'); break;
      case 'blockquoteToggle': editor.commands.insertContent('<div class="blockquote-toggle"><p></p></div>'); break;
      case 'page': 
        setPageSearchMenu({ isOpen: true, x: slashMenu.x, y: slashMenu.y, query: slashMenu.query.replace(/^page\s*/i, '') }); 
        break;
      case 'divider': editor.commands.setHorizontalRule(); break;
      case 'table': 
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        break;
      case 'table-week': 
        editor.chain().focus().insertTable({ rows: 4, cols: 7, withHeaderRow: true }).run();
        break;
      case 'table-day': 
        editor.chain().focus().insertTable({ rows: 8, cols: 2, withHeaderRow: true }).run();
        break;
      case 'table-habit': 
        editor.chain().focus().insertTable({ rows: 5, cols: 8, withHeaderRow: true }).run();
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
        
        setAlarmModal({ isOpen: true, initialTimeStr });
        break;
      }
      case 'documento': {
        setFileUploadModal({ isOpen: true, isLink: false });
        break;
      }
      case 'documento-link': {
        setFileSelectModal(true);
        break;
      }
    }
  }, [slashMenu, setPageSearchMenu, setFocusModal, setAlarmModal, setFileUploadModal, setFileSelectModal]);

  return { slashMenu, setSlashMenu, handleSlashKeyDown, updateSlashMenuOnUpdate, executeSlashCommand };
}
