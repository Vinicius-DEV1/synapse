import { useMemo } from 'react';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Highlight } from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
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
import { ResizableImage } from '../../editor-extensions/ResizableImage';
import { EncryptedImage } from '../../editor-extensions/EncryptedImage';
import { PageReference } from '../../editor-extensions/PageReference';
import CodeBlockComponent from '../../editor-extensions/CodeBlockComponent';
import { FocusWidgetBlock } from '../../editor-extensions/FocusWidgetBlock';
import { AlarmWidgetBlock } from '../../editor-extensions/AlarmWidgetBlock';
import { FileWidgetBlock } from '../../editor-extensions/FileWidgetBlock';
import { CalendarEventWidgetBlock } from '../../editor-extensions/CalendarEventWidgetBlock';
import { CustomDivider } from '../../editor-extensions/CustomDivider';


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
        history: false,
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
      ResizableImage.configure({ inline: true }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      TaskList, TaskItem.configure({ nested: true }),
      Collaboration.configure({ document: ydoc || new Y.Doc() }),
      GroupBlock,
      QuestionBlock,
      ToggleBlock,
      BlockquoteToggle,
      LinkPreviewBlock,
      EncryptedImage,
      PageReference,
      FocusWidgetBlock,
      AlarmWidgetBlock,
      FileWidgetBlock,
      CalendarEventWidgetBlock,
      CustomDivider
    ];
  }, [ydoc]);
}
