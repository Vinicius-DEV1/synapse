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
    title: "Caderno"
    color: "#0f0e17"
    flags: Qt.Window | Qt.FramelessWindowHint

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
