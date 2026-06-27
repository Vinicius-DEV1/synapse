import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent, FloatingMenu, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import { applyBase64StateToYDoc, getYDocStateAsBase64 } from '../utils/yjs-utils';
import { getSettings } from '../utils/settings';
import SlashMenu from './SlashMenu';
import FloatingToolbar from './FloatingToolbar';

// Nossos blocos
import { GroupBlock } from './editor-extensions/GroupBlock';
import { QuestionBlock } from './editor-extensions/QuestionBlock';
import { ToggleBlock } from './editor-extensions/ToggleBlock';
import { PageReference } from './editor-extensions/PageReference';

interface EditorProps {
  pageId: string | null;
  initialContent: string;
  initialCrdtState?: string | null;
  onSave: (content: string, crdtState: string | null, embeddedSaves?: {id: string, content: string}[]) => void;
  onCreateLinkedPage?: (title: string) => Promise<string>;
}

export default function Editor({ pageId, initialContent, initialCrdtState, onSave, onCreateLinkedPage }: EditorProps) {
  const [settings, setSettings] = useState(getSettings());
  const ydocRef = useRef<Y.Doc | null>(null);

  // States para Slash Menu manual
  const [slashMenu, setSlashMenu] = useState<{ query: string } | null>(null);

  useEffect(() => {
    const handleSettingsChange = () => setSettings(getSettings());
    window.addEventListener('app-settings-changed', handleSettingsChange);
    return () => window.removeEventListener('app-settings-changed', handleSettingsChange);
  }, []);

  if (!ydocRef.current || ydocRef.current.guid !== pageId) {
    ydocRef.current = new Y.Doc();
    ydocRef.current.guid = pageId || 'temp';
    if (initialCrdtState) {
      applyBase64StateToYDoc(ydocRef.current, initialCrdtState);
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, 
      }),
      Placeholder.configure({ placeholder: "Digite '/' para comandos ou comece a escrever..." }),
      Highlight,
      Link.configure({ openOnClick: false }),
      Image,
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      TaskList, TaskItem.configure({ nested: true }),
      Collaboration.configure({ document: ydocRef.current }),
      GroupBlock,
      QuestionBlock,
      ToggleBlock,
      PageReference
    ],
    content: initialCrdtState ? undefined : initialContent,
    editorProps: {
      attributes: {
        class: `editor-content min-h-[300px] leading-relaxed text-dark-text/90 focus:outline-none ${settings.fontSize} ai-highlight-${settings.aiChatHighlight || 'glow'}`,
        spellcheck: settings.spellcheck ? 'true' : 'false',
      },
      handleKeyDown: (view, event) => {
        if (event.key === '/') {
          setSlashMenu({ query: '' });
          // Não dá preventDefault para o / aparecer
          return false;
        }
        if (slashMenu) {
          if (event.key === 'Escape') {
            setSlashMenu(null);
            return true;
          }
          if (event.key === 'Backspace' && slashMenu.query.length === 0) {
            setSlashMenu(null);
            return false;
          }
          if (event.key.length === 1 && event.key !== '/') {
            setSlashMenu(prev => prev ? { query: prev.query + event.key } : null);
          } else if (event.key === 'Backspace') {
            setSlashMenu(prev => prev ? { query: prev.query.slice(0, -1) } : null);
          }
        }
        return false;
      }
    },
    onUpdate: ({ editor }) => {
      if (!ydocRef.current) return;
      const html = editor.getHTML();
      const crdtState = getYDocStateAsBase64(ydocRef.current);
      onSave(html, crdtState, []); // Embeds saves serão tratados depois se necessário
    },
  }, [pageId]);

  const executeSlashCommand = useCallback((commandId: string) => {
    if (!editor) return;
    setSlashMenu(null);
    
    // Apaga o que foi digitado de query e a barra "/"
    const pos = editor.state.selection.$head.pos;
    const queryLen = (slashMenu?.query.length || 0) + 1; // +1 for the '/'
    editor.commands.deleteRange({ from: pos - queryLen, to: pos });

    switch (commandId) {
      case 'h1': editor.commands.toggleHeading({ level: 1 }); break;
      case 'h2': editor.commands.toggleHeading({ level: 2 }); break;
      case 'h3': editor.commands.toggleHeading({ level: 3 }); break;
      case 'todo': editor.commands.toggleTaskList(); break;
      case 'bullet': editor.commands.toggleBulletList(); break;
      case 'callout': editor.commands.toggleBlockquote(); break;
      case 'code': editor.commands.toggleCodeBlock(); break;
      case 'group': editor.commands.insertContent('<div class="group-collection"></div>'); break;
      case 'question': editor.commands.insertContent('<div class="question-block"></div>'); break;
      case 'divider': editor.commands.setHorizontalRule(); break;
      case 'table': 
        editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true }); 
        break;
      // TODO: Implementar 'page' e 'ia'
      default: break;
    }
  }, [editor, slashMenu]);

  return (
    <div className="relative tiptap-wrapper">
      {editor && slashMenu && (
        <div className="absolute z-50 mt-8" style={{ top: 0, left: 0 }}>
          {/* Mock absolute positioning for now, ideally we use getBoundingClientRect() of cursor */}
          <SlashMenu 
            x={100} y={100} 
            query={slashMenu.query} 
            onSelect={executeSlashCommand} 
            onClose={() => setSlashMenu(null)} 
          />
        </div>
      )}

      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <FloatingToolbar 
            formatState={{
              bold: editor.isActive('bold'),
              italic: editor.isActive('italic'),
              strike: editor.isActive('strike'),
              code: editor.isActive('code'),
              highlight: editor.isActive('highlight'),
            }}
            onFormat={(cmd) => {
              if (cmd === 'bold') editor.commands.toggleBold();
              if (cmd === 'italic') editor.commands.toggleItalic();
              if (cmd === 'strike') editor.commands.toggleStrike();
              if (cmd === 'code') editor.commands.toggleCode();
              if (cmd === 'highlight') editor.commands.toggleHighlight();
            }}
          />
        </BubbleMenu>
      )}

      {editor && <EditorContent editor={editor} />}
    </div>
  );
}
