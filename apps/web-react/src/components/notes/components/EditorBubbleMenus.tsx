import { BubbleMenu } from '@tiptap/react/menus';
import { NodeSelection } from '@tiptap/pm/state';
import type { Editor as TipTapEditor } from '@tiptap/core';
import FloatingToolbar from './FloatingToolbar';
import TableToolbar from './TableToolbar';

const EXCLUDED_BLOCK_TYPES = new Set([
  'table',
  'image',
  'encryptedImage',
  'resizableImage',
  'linkPreview',
  'horizontalRule',
  'customDivider',
  'codeBlock',
  'fileWidget',
  'documentBundle',
  'alarmWidget',
  'calendarEventWidget',
  'focusWidget',
  'mediaWidget',
]);

interface EditorBubbleMenusProps {
  editor: TipTapEditor | null;
}

export function EditorBubbleMenus({ editor }: EditorBubbleMenusProps) {
  if (!editor) return null;

  return (
    <>
      <BubbleMenu
        editor={editor}
        options={{ placement: 'top' }}
        pluginKey="floatingToolbarBubbleMenu"
        shouldShow={({ editor: activeEditor, from, to }) => {
          if (from === to) return false;
          // Floating toolbar is intended for inline text formatting.
          // Hide if the selection is a node (NodeSelection) or a specific widget/block.
          const { selection } = activeEditor.state;
          if (selection instanceof NodeSelection) return false;

          // O(depth) ancestor traversal checking against static Set (bypassing 13 sequential isActive schema queries)
          const { $from, $to } = selection;
          for (let d = $from.depth; d > 0; d--) {
            if (EXCLUDED_BLOCK_TYPES.has($from.node(d).type.name)) return false;
          }
          if (!$from.sameParent($to)) {
            for (let d = $to.depth; d > 0; d--) {
              if (EXCLUDED_BLOCK_TYPES.has($to.node(d).type.name)) return false;
            }
          }

          return true;
        }}
        className="flex shadow-elevated rounded-xl border border-white/5 bg-dark-bg/80 backdrop-blur-xl overflow-visible"
      >
        <FloatingToolbar editor={editor} />
      </BubbleMenu>

      <BubbleMenu
        editor={editor}
        options={{
          placement: 'top',
          offset: 36,
        }}
        pluginKey="tableBubbleMenu"
        shouldShow={({ editor: activeEditor }) => activeEditor.isActive('table')}
        className="z-[100] relative flex overflow-visible"
      >
        <TableToolbar editor={editor} />
      </BubbleMenu>
    </>
  );
}
