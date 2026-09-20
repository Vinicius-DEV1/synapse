import { useMemo } from 'react';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Highlight } from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Link } from '@tiptap/extension-link';
import { Table, TableRow } from '@tiptap/extension-table';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Collaboration } from '@tiptap/extension-collaboration';
import BulletList from '@tiptap/extension-bullet-list';
import Bold from '@tiptap/extension-bold';
import { wrappingInputRule } from '@tiptap/core';
import * as Y from 'yjs';

// Custom Extensions
import { TableCell } from '../../editor-extensions/TableCell';
import { TableHeader } from '../../editor-extensions/TableHeader';
import { CollectionBlock } from '../../editor-extensions/CollectionBlock';
import { QuestionBlock } from '../../editor-extensions/QuestionBlock';
import { ToggleBlock } from '../../editor-extensions/ToggleBlock';
import { ColorBlockquote } from '../../editor-extensions/ColorBlockquote';
import { BlockquoteToggle } from '../../editor-extensions/BlockquoteToggle';
import { LinkPreviewBlock } from '../../editor-extensions/links/LinkPreviewBlock';
import { LinkGroupBlock } from '../../editor-extensions/LinkGroupBlock';
import { ResizableImage } from '../../editor-extensions/ResizableImage';
import { EncryptedImage } from '../../editor-extensions/EncryptedImage';
import { PageReference } from '../../editor-extensions/PageReference';
import CodeBlockComponent from '../../editor-extensions/CodeBlockComponent';
import { FocusWidgetBlock } from '../../editor-extensions/FocusWidgetBlock';
import { AlarmWidgetBlock } from '../../editor-extensions/AlarmWidgetBlock';
import { FileWidgetBlock } from '../../editor-extensions/FileWidgetBlock';
import { DocumentBundleBlock } from '../../editor-extensions/bundles/DocumentBundleBlock';
import { CalendarEventWidgetBlock } from '../../editor-extensions/CalendarEventWidgetBlock';
import { MediaWidgetBlock } from '../../editor-extensions/MediaWidgetBlock';
import { CustomDivider } from '../../editor-extensions/CustomDivider';
import { BlobImageInterceptor } from '../../editor-extensions/BlobImageInterceptor';
import { ColumnBlock } from '../../editor-extensions/columns/ColumnBlock';
import { ColumnGroup } from '../../editor-extensions/columns/ColumnGroup';
import { DragToGroup, GroupAutoCollapse } from '../../editor-extensions/group-layout';
import { ImageKeymap } from '../../editor-extensions/image/ImageKeymap';
import { Spoiler } from '../../editor-extensions/Spoiler';
import { ScrapWidgetBlock } from '../../editor-extensions/scraps/ScrapWidgetBlock';

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

const sharedLowlight = createLowlight(common);

export function useEditorExtensions(ydoc: Y.Doc | null) {
  return useMemo(() => {
    return [
      StarterKit.configure({
        // Disable local UndoRedo to use integrated Yjs/Collaboration history
        undoRedo: false,
        codeBlock: false,
        blockquote: false,
        bulletList: false,  // Replaced by CustomBulletList (shortcut '-' only)
        bold: false,        // Replaced by CustomBold (Ctrl+B shortcut)
        horizontalRule: false, // Replaced by CustomDivider
        // Dropcursor customizado de alta visibilidade no tema escuro
        dropcursor: { color: '#f59e0b', width: 3, class: 'caderno-dropcursor' },
      }),
      CustomBulletList,
      CustomBold,
      ColorBlockquote,
      CodeBlockLowlight.extend({
        draggable: true,
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockComponent);
        },
        addKeyboardShortcuts() {
          const parentShortcuts = typeof this.parent === 'function' ? this.parent() : {};
          return {
            ...parentShortcuts,
            'Shift-Enter': ({ editor }) => {
              const { state, dispatch } = editor.view;
              const { $head } = state.selection;
              let isInsideCode = false;
              for (let depth = $head.depth; depth > 0; depth--) {
                if ($head.node(depth).type.name === this.name) {
                  isInsideCode = true;
                  break;
                }
              }
              if (!isInsideCode) return false;
              dispatch(state.tr.replaceSelectionWith(state.schema.text('\n')).scrollIntoView());
              return true;
            },
          };
        },
      }).configure({ lowlight: sharedLowlight }),
      Placeholder.configure({ placeholder: "Digite '/' para comandos ou comece a escrever..." }),
      Highlight.configure({ multicolor: true }),
      Underline,
      Link.configure({ openOnClick: false }),
      ResizableImage,
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      TaskList, TaskItem.configure({ nested: true }),
      ...(ydoc ? [Collaboration.configure({ document: ydoc })] : []),
      CollectionBlock,
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
      DocumentBundleBlock,
      CalendarEventWidgetBlock,
      MediaWidgetBlock,
      CustomDivider,
      BlobImageInterceptor,
      ColumnBlock,
      ColumnGroup,
      DragToGroup,
      GroupAutoCollapse,
      TextStyle,
      Color,
      ImageKeymap,
      Spoiler,
      ScrapWidgetBlock,
    ];
  }, [ydoc]);
}
