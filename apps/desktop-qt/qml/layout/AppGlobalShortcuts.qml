import QtQuick 2.15
import "../ui"

Item {
    id: shortcutsRoot

    signal openCommandPalette()
    signal newPageRequested()
    signal newTabRequested()
    signal closeActiveTabRequested()
    signal nextTabRequested()
    signal previousTabRequested()
    signal toggleSidebarRequested()
    signal toggleFullscreenRequested()
    signal openTabRequested(string moduleKey, string title, string icon)

    Shortcut { sequence: "Ctrl+K"; onActivated: shortcutsRoot.openCommandPalette() }
    Shortcut { sequence: "Ctrl+P"; onActivated: shortcutsRoot.openCommandPalette() }
    Shortcut { sequence: "Ctrl+N"; onActivated: shortcutsRoot.newPageRequested() }
    Shortcut { sequence: "Ctrl+T"; onActivated: shortcutsRoot.newTabRequested() }
    Shortcut { sequence: "Ctrl+W"; onActivated: shortcutsRoot.closeActiveTabRequested() }
    Shortcut { sequence: "Ctrl+Tab"; onActivated: shortcutsRoot.nextTabRequested() }
    Shortcut { sequence: "Ctrl+Shift+Tab"; onActivated: shortcutsRoot.previousTabRequested() }
    Shortcut { sequence: "Ctrl+B"; onActivated: shortcutsRoot.toggleSidebarRequested() }
    Shortcut { sequence: "Ctrl+\\"; onActivated: shortcutsRoot.toggleSidebarRequested() }
    Shortcut { sequence: "F11"; onActivated: shortcutsRoot.toggleFullscreenRequested() }
    Shortcut { sequence: "Ctrl+,"; onActivated: shortcutsRoot.openTabRequested("settings", qsTr("Configurações"), "⚙️") }

    // Module Switch Shortcuts (Ctrl+1 to Ctrl+9, Ctrl+0)
    Shortcut { sequence: "Ctrl+H"; onActivated: shortcutsRoot.openTabRequested("home", qsTr("Início"), "🏠") }
    Shortcut { sequence: "Ctrl+1"; onActivated: shortcutsRoot.openTabRequested("notes", qsTr("Caderno"), "📖") }
    Shortcut { sequence: "Ctrl+2"; onActivated: shortcutsRoot.openTabRequested("video", qsTr("Vídeos"), "🎬") }
    Shortcut { sequence: "Ctrl+3"; onActivated: shortcutsRoot.openTabRequested("anki", qsTr("Flashcards"), "🎴") }
    Shortcut { sequence: "Ctrl+4"; onActivated: shortcutsRoot.openTabRequested("quiz", qsTr("Quiz"), "☑️") }
    Shortcut { sequence: "Ctrl+5"; onActivated: shortcutsRoot.openTabRequested("finance", qsTr("Finanças"), "💵") }
    Shortcut { sequence: "Ctrl+6"; onActivated: shortcutsRoot.openTabRequested("calendar", qsTr("Agenda"), "📅") }
    Shortcut { sequence: "Ctrl+7"; onActivated: shortcutsRoot.openTabRequested("library", qsTr("Biblioteca"), "📚") }
    Shortcut { sequence: "Ctrl+8"; onActivated: shortcutsRoot.openTabRequested("culture", qsTr("Cultura"), "🎭") }
    Shortcut { sequence: "Ctrl+9"; onActivated: shortcutsRoot.openTabRequested("focus", qsTr("Foco"), "⏳") }
    Shortcut { sequence: "Ctrl+0"; onActivated: shortcutsRoot.openTabRequested("vault", qsTr("Cofre"), "🔒") }
}
