import QtQuick 2.15

Item {
    id: shortcuts
    property bool enabledForReading: false
    property bool canGoBack: false
    property bool canGoForward: false
    signal previousRequested()
    signal nextRequested()

    Shortcut {
        sequence: "Left"
        autoRepeat: false
        enabled: shortcuts.enabledForReading && shortcuts.canGoBack
        onActivated: shortcuts.previousRequested()
    }
    Shortcut {
        sequence: "Right"
        autoRepeat: false
        enabled: shortcuts.enabledForReading && shortcuts.canGoForward
        onActivated: shortcuts.nextRequested()
    }
}
