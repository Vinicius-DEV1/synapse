import QtQuick 2.15
import QtQuick.Controls 2.15
import "settings"
import "vault"

ApplicationWindow {
    id: appWindow
    visible: true
    width: 1366
    height: 840
    minimumWidth: 1024
    minimumHeight: 680
    property string windowTitle: "Synapse"
    title: windowTitle
    color: "#0f0e17"
    flags: Qt.Window | Qt.FramelessWindowHint

    onClosing: function(close) {
        if (authenticatedShell.item && typeof authenticatedShell.item.flushActiveNotes === "function") {
            authenticatedShell.item.flushActiveNotes()
        }
    }

    WindowResizeHandles {
        targetWindow: appWindow
    }

    Loader {
        id: authenticatedShell
        anchors.fill: parent
        active: dataController.isVaultConfigured && dataController.isVaultUnlocked
        sourceComponent: Component {
            AuthenticatedApplication {
                windowRoot: appWindow
                onActiveTitleChanged: {
                    appWindow.windowTitle = activeTitle ? (activeTitle + " — Synapse") : "Synapse"
                }
            }
        }
    }

    VaultUnlockScreen {
        anchors.fill: parent
        visible: dataController.isVaultConfigured && !dataController.isVaultUnlocked
        z: 20
    }

    MasterPasswordModal {
        anchors.fill: parent
        mode: "setup"
        isMandatory: true
        visible: !dataController.isVaultConfigured
        z: 30
    }
}
