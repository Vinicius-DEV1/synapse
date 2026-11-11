import QtQuick 2.15

Item {
    id: shortcutsRoot

    property bool hasPage: false
    property bool isPreviewMode: false
    property bool isHistoryOpen: false
    property bool isEmojiPickerOpen: false
    property bool contentEditorFocused: false

    signal saveRequested()
    signal previewToggleRequested()
    signal formatRequested(string prefix, string suffix)
    signal richMarkRequested(string mark)

    Shortcut {
        sequences: ["Ctrl+S", "Cmd+S"]
        enabled: shortcutsRoot.hasPage && !shortcutsRoot.isHistoryOpen && !shortcutsRoot.isEmojiPickerOpen
        onActivated: shortcutsRoot.saveRequested()
    }

    Shortcut {
        sequences: ["Ctrl+E", "Cmd+E"]
        enabled: shortcutsRoot.hasPage && !shortcutsRoot.isHistoryOpen && !shortcutsRoot.isEmojiPickerOpen
        onActivated: shortcutsRoot.previewToggleRequested()
    }

    Shortcut {
        sequences: ["Ctrl+B", "Cmd+B"]
        enabled: shortcutsRoot.hasPage && !shortcutsRoot.isPreviewMode &&
                 !shortcutsRoot.isHistoryOpen && !shortcutsRoot.isEmojiPickerOpen &&
                 shortcutsRoot.contentEditorFocused
        onActivated: shortcutsRoot.formatRequested("<strong>", "</strong>")
    }

    Shortcut {
        sequences: ["Ctrl+I", "Cmd+I"]
        enabled: shortcutsRoot.hasPage && !shortcutsRoot.isPreviewMode &&
                 !shortcutsRoot.isHistoryOpen && !shortcutsRoot.isEmojiPickerOpen &&
                 shortcutsRoot.contentEditorFocused
        onActivated: shortcutsRoot.formatRequested("<em>", "</em>")
    }

    Shortcut {
        sequences: ["Ctrl+U", "Cmd+U"]
        enabled: shortcutsRoot.hasPage && !shortcutsRoot.isPreviewMode &&
                 !shortcutsRoot.isHistoryOpen && !shortcutsRoot.isEmojiPickerOpen &&
                 shortcutsRoot.contentEditorFocused
        onActivated: shortcutsRoot.formatRequested("<u>", "</u>")
    }

    Shortcut {
        sequences: ["Ctrl+Shift+X", "Cmd+Shift+X"]
        enabled: shortcutsRoot.hasPage && !shortcutsRoot.isPreviewMode &&
                 !shortcutsRoot.isHistoryOpen && !shortcutsRoot.isEmojiPickerOpen &&
                 shortcutsRoot.contentEditorFocused
        onActivated: shortcutsRoot.formatRequested("<s>", "</s>")
    }

    Shortcut {
        sequences: ["Ctrl+Shift+S", "Cmd+Shift+S"]
        enabled: shortcutsRoot.hasPage && !shortcutsRoot.isPreviewMode &&
                 !shortcutsRoot.isHistoryOpen && !shortcutsRoot.isEmojiPickerOpen &&
                 shortcutsRoot.contentEditorFocused
        onActivated: shortcutsRoot.richMarkRequested("spoiler")
    }
}
