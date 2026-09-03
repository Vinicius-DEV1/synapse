import { BubbleMenu } from '@tiptap/react/menus';
import { NodeSelection } from '@tiptap/pm/state';
import type { Editor as TipTapEditor } from '@tiptap/core';
import FloatingToolbar from './FloatingToolbar';
import TableToolbar from './TableToolbar';

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
          if (activeEditor.isActive('table')) return false;
          if (
            activeEditor.isActive('image') ||
            activeEditor.isActive('encryptedImage') ||
            activeEditor.isActive('resizableImage') ||
            activeEditor.isActive('linkPreview') ||
            activeEditor.isActive('horizontalRule') ||
            activeEditor.isActive('customDivider') ||
            activeEditor.isActive('codeBlock') ||
            activeEditor.isActive('fileWidget') ||
            activeEditor.isActive('alarmWidget') ||
            activeEditor.isActive('calendarEventWidget') ||
            activeEditor.isActive('focusWidget') ||
            activeEditor.isActive('mediaWidget')
          ) {
            return false;
          }
          return true;
        }}
        className="flex shadow-elevated rounded-xl overflow-hidden border border-white/5 bg-dark-bg/80 backdrop-blur-xl"
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
        className="z-[100] relative flex shadow-2xl rounded-xl overflow-hidden border border-white/10 bg-dark-card/95 backdrop-blur-xl"
      >
        <TableToolbar editor={editor} />
      </BubbleMenu>
    </>
  );
}
