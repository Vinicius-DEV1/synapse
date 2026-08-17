import { useMemo } from 'react';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Highlight } from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Link } from '@tiptap/extension-link';
import { Table, TableRow, TableHeader } from '@tiptap/extension-table';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Collaboration } from '@tiptap/extension-collaboration';
import BulletList from '@tiptap/extension-bullet-list';
import Bold from '@tiptap/extension-bold';
import { wrappingInputRule } from '@tiptap/core';
import * as Y from 'yjs';

// Custom Extensions
import { TableCell } from '../../editor-extensions/TableCell';
import { GroupBlock } from '../../editor-extensions/GroupBlock';
import { QuestionBlock } from '../../editor-extensions/QuestionBlock';
import { ToggleBlock } from '../../editor-extensions/ToggleBlock';
import { ColorBlockquote } from '../../editor-extensions/ColorBlockquote';
import { BlockquoteToggle } from '../../editor-extensions/BlockquoteToggle';
import { LinkPreviewBlock } from '../../editor-extensions/LinkPreviewBlock';
import { LinkGroupBlock } from '../../editor-extensions/LinkGroupBlock';
import { ResizableImage } from '../../editor-extensions/ResizableImage';
import { EncryptedImage } from '../../editor-extensions/EncryptedImage';
import { PageReference } from '../../editor-extensions/PageReference';
import CodeBlockComponent from '../../editor-extensions/CodeBlockComponent';
import { FocusWidgetBlock } from '../../editor-extensions/FocusWidgetBlock';
import { AlarmWidgetBlock } from '../../editor-extensions/AlarmWidgetBlock';
import { FileWidgetBlock } from '../../editor-extensions/FileWidgetBlock';
import { CalendarEventWidgetBlock } from '../../editor-extensions/CalendarEventWidgetBlock';
import { MediaWidgetBlock } from '../../editor-extensions/MediaWidgetBlock';
import { CustomDivider } from '../../editor-extensions/CustomDivider';
import { BlobImageInterceptor } from '../../editor-extensions/BlobImageInterceptor';
import { ColumnBlock } from '../../editor-extensions/columns/ColumnBlock';
import { ColumnGroup } from '../../editor-extensions/columns/ColumnGroup';
import { DragToGroup, GroupAutoCollapse } from '../../editor-extensions/group-layout';
import { ImageKeymap } from '../../editor-extensions/image/ImageKeymap';

// Only '-' creates bullet list (removes * and + shortcuts)
const CustomBulletList = BulletList.extend({
  addInputRules() {
    return [
      wrappingInputRule({
        find: /^\s*(-)\s$/,
        type: this.type,
      }),
    ];
  },
});

// Bold only via Ctrl+B — disables ** markdown shortcut
const CustomBold = Bold.extend({
  addInputRules() {
    return [];
  },
});

export function useEditorExtensions(ydoc: Y.Doc | null) {
  return useMemo(() => {
    const lowlight = createLowlight(common);
    
    return [
      StarterKit.configure({
        // No Tiptap 3 a opção chama-se `undoRedo` — `history: false` era
        // silenciosamente ignorado, então o UndoRedo local rodava junto com o
        // Collaboration (que traz o próprio histórico via Yjs). O próprio
        // Tiptap avisa que os dois são incompatíveis: o Ctrl+Z ficava
        // imprevisível e podia dessincronizar o CRDT.
        undoRedo: false,
        codeBlock: false,
        blockquote: false,
        bulletList: false,  // replaced by CustomBulletList (only - shortcut)
        bold: false,        // replaced by CustomBold (no ** shortcut, Ctrl+B only)
        horizontalRule: false, // replaced by CustomDivider (for draggable node views)
      }),
      CustomBulletList,
      CustomBold,
      ColorBlockquote,
      CodeBlockLowlight.extend({
        draggable: true,
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockComponent);
        }
      }).configure({ lowlight }),
      Placeholder.configure({ placeholder: "Digite '/' para comandos ou comece a escrever..." }),
      Highlight.configure({ multicolor: true }),
      Underline,
      Link.configure({ openOnClick: false }),
      // Nada de `.configure({ inline: true })` aqui: a extensão fixa
      // `inline: false` / `group: 'block'`, então a opção era ignorada e só
      // confundia quem lesse o código.
      ResizableImage,
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      TaskList, TaskItem.configure({ nested: true }),
      Collaboration.configure({ document: ydoc || new Y.Doc() }),
      GroupBlock,
      QuestionBlock,
      ToggleBlock,
      BlockquoteToggle,
      LinkPreviewBlock,
      LinkGroupBlock,
      EncryptedImage,
      PageReference,
      FocusWidgetBlock,
      AlarmWidgetBlock,
      FileWidgetBlock,
      CalendarEventWidgetBlock,
      MediaWidgetBlock,
      CustomDivider,
      BlobImageInterceptor,
      ColumnBlock,
      ColumnGroup,
      // Layouts lado a lado (colunas e cards de link) — ver `group-layout/`.
      DragToGroup,
      GroupAutoCollapse,
      // Estilo inline (necessário para que Color funcione).
      TextStyle,
      // Permite definir cor de texto via editor.chain().setColor(hex).
      Color,
      ImageKeymap,
    ];
  }, [ydoc]);
}
