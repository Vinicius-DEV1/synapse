import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../auth"
import "../layout"
import "../ui"

Rectangle {
    id: unlockScreenRoot
    anchors.fill: parent
    color: "#0f0e17"

    property var windowRoot: null
    property bool isShaking: false
    property int lockoutRemainingSeconds: dataController.vaultUnlockRemainingSeconds

    signal unlocked()

    Timer {
        interval: 1000
        repeat: true
        running: unlockScreenRoot.visible && unlockScreenRoot.lockoutRemainingSeconds > 0
        onTriggered: {
            dataController.refreshVaultLockout()
            unlockScreenRoot.lockoutRemainingSeconds = dataController.vaultUnlockRemainingSeconds
        }
    }

    Connections {
        target: dataController
        function onVaultLockoutChanged() {
            unlockScreenRoot.lockoutRemainingSeconds = dataController.vaultUnlockRemainingSeconds
        }
    }

    SequentialAnimation {
        id: shakeAnim
        running: unlockScreenRoot.isShaking
        loops: 1
        alwaysRunToEnd: true

        NumberAnimation { target: cardContainer; property: "x"; to: cardContainer.originalX - 10; duration: 50; easing.type: Easing.OutQuad }
        NumberAnimation { target: cardContainer; property: "x"; to: cardContainer.originalX + 10; duration: 50; easing.type: Easing.OutQuad }
        NumberAnimation { target: cardContainer; property: "x"; to: cardContainer.originalX - 8; duration: 50; easing.type: Easing.OutQuad }
        NumberAnimation { target: cardContainer; property: "x"; to: cardContainer.originalX + 8; duration: 50; easing.type: Easing.OutQuad }
        NumberAnimation { target: cardContainer; property: "x"; to: cardContainer.originalX - 4; duration: 40; easing.type: Easing.OutQuad }
        NumberAnimation { target: cardContainer; property: "x"; to: cardContainer.originalX + 4; duration: 40; easing.type: Easing.OutQuad }
        NumberAnimation { target: cardContainer; property: "x"; to: cardContainer.originalX; duration: 40; easing.type: Easing.OutQuad }

        onFinished: unlockScreenRoot.isShaking = false
    }

    function doUnlock() {
        if (lockoutRemainingSeconds > 0) return
        var pass = passwordField.text
        if (pass.trim().length === 0) return

        passwordField.text = ""
        showPasswordBtn.checked = false
        var success = dataController.unlockVault(pass)
        pass = ""
        if (success) {
            unlockScreenRoot.unlocked()
        } else {
            unlockScreenRoot.isShaking = true
            shakeAnim.restart()
            passwordField.forceActiveFocus()
        }
    }

    // Top frameless window drag bar & controls matching AuthScreenView.tsx
    Item {
        id: topBar
        anchors.top: parent.top
        anchors.left: parent.left
        anchors.right: parent.right
        height: 40
        z: 50

        DragHandler {
            onActiveChanged: {
                if (active && unlockScreenRoot.windowRoot) {
                    unlockScreenRoot.windowRoot.startSystemMove()
                }
            }
        }

        WindowControls {
            anchors.right: parent.right
            anchors.rightMargin: 10
            anchors.verticalCenter: parent.verticalCenter
            isMaximized: unlockScreenRoot.windowRoot && unlockScreenRoot.windowRoot.visibility === Window.Maximized
            onMinimizeClicked: if (unlockScreenRoot.windowRoot) unlockScreenRoot.windowRoot.showMinimized()
            onMaximizeClicked: {
                if (!unlockScreenRoot.windowRoot) return
                if (unlockScreenRoot.windowRoot.visibility === Window.Maximized) {
                    unlockScreenRoot.windowRoot.showNormal()
                } else {
                    unlockScreenRoot.windowRoot.showMaximized()
                }
            }
            onCloseClicked: if (unlockScreenRoot.windowRoot) unlockScreenRoot.windowRoot.close()
        }
    }

    Item {
        id: cardContainer
        width: Math.min(440, parent.width - 32)
        height: cardLayout.implicitHeight + 64
        anchors.centerIn: parent
        property real originalX: (parent.width - width) / 2

        Rectangle {
            anchors.fill: parent
            radius: 16
            color: unlockScreenRoot.lockoutRemainingSeconds > 0 ? "#1a0f0f" : "#1a1924"
            border.color: unlockScreenRoot.lockoutRemainingSeconds > 0 ? "#80ef4444" : "#0fffffff"
            border.width: 1

            ColumnLayout {
                id: cardLayout
                anchors.fill: parent
                anchors.margins: 32
                spacing: 18

                // Minimalist Lock Badge matching AuthScreenView.tsx
                Rectangle {
                    Layout.alignment: Qt.AlignHCenter
                    width: 48
                    height: 48
                    radius: 24
                    color: "#0dffffff"
                    border.color: "#14ffffff"
                    border.width: 1

                    AppIcon {
                        anchors.centerIn: parent
                        name: "vault"
                        color: "#94a1b2"
                        width: 20
                        height: 20
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 6

                    Text {
                        Layout.alignment: Qt.AlignHCenter
                        text: qsTr("Synapse está bloqueado")
                        color: "#fffffe"
                        font.pixelSize: 20
                        font.weight: Font.Medium
                    }

                    Text {
                        Layout.fillWidth: true
                        horizontalAlignment: Text.AlignHCenter
                        wrapMode: Text.WordWrap
                        text: qsTr("Digite sua senha mestra para abrir seu workspace criptografado.")
                        color: "#a7a9be"
                        font.pixelSize: 13
                        lineHeight: 1.35
                    }
                }

                // Error Banner matching ErrorNotice in AuthScreenView.tsx
                Rectangle {
                    Layout.fillWidth: true
                    implicitHeight: errorRow.implicitHeight + 16
                    radius: 10
                    visible: dataController.vaultLockError.length > 0 && unlockScreenRoot.lockoutRemainingSeconds === 0
                    color: "#18ef4444"
                    border.color: "#33ef4444"
                    border.width: 1

                    RowLayout {
                        id: errorRow
                        anchors.fill: parent
                        anchors.leftMargin: 12
                        anchors.rightMargin: 12
                        spacing: 8

                        AppIcon { name: "alert"; color: "#f87171"; width: 15; height: 15 }

                        Text {
                            Layout.fillWidth: true
                            text: dataController.vaultLockError
                            color: "#f87171"
                            font.pixelSize: 12
                            wrapMode: Text.WordWrap
                        }
                    }
                }

                // Password Field matching AuthScreenView.tsx
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 6

                    Text {
                        Layout.leftMargin: 4
                        text: qsTr("SENHA DO COFRE")
                        color: "#a7a9be"
                        font.pixelSize: 11
                        font.weight: Font.Medium
                        font.letterSpacing: 0.7
                    }

                    Rectangle {
                        Layout.fillWidth: true
                        height: 44
                        radius: 12
                        color: "#0f0e17"
                        border.color: passwordField.activeFocus ? "#808b5cf6" : "#14ffffff"
                        border.width: 1
                        Behavior on border.color { ColorAnimation { duration: 150 } }

                        RowLayout {
                            anchors.fill: parent
                            anchors.leftMargin: 12
                            anchors.rightMargin: 8
                            spacing: 8

                            AppIcon { name: "key"; color: "#71717a"; width: 14; height: 14 }

                            TextField {
                                id: passwordField
                                Layout.fillWidth: true
                                placeholderText: qsTr("Digite sua senha mestra...")
                                placeholderTextColor: "#4b5563"
                                color: "#fffffe"
                                font.pixelSize: 14
                                echoMode: showPasswordBtn.checked ? TextInput.Normal : TextInput.Password
                                background: null
                                selectByMouse: true
                                focus: true
                                enabled: unlockScreenRoot.lockoutRemainingSeconds === 0
                                Keys.onReturnPressed: unlockScreenRoot.doUnlock()
                            }

                            ToolButton {
                                id: showPasswordBtn
                                checkable: true
                                Layout.preferredWidth: 30
                                Layout.preferredHeight: 30
                                focusPolicy: Qt.NoFocus
                                ToolTip.visible: hovered
                                ToolTip.text: checked ? qsTr("Ocultar senha") : qsTr("Mostrar senha")
                                background: Rectangle {
                                    radius: 8
                                    color: parent.hovered ? "#14ffffff" : "transparent"
                                }
                                contentItem: AppIcon {
                                    anchors.centerIn: parent
                                    name: showPasswordBtn.checked ? "eye-off" : "eye"
                                    color: "#94a1b2"
                                    width: 15
                                    height: 15
                                }
                            }
                        }
                    }
                }

                // Primary Action Button matching AuthScreenView.tsx
                Rectangle {
                    Layout.fillWidth: true
                    height: 44
                    radius: 12
                    color: unlockScreenRoot.lockoutRemainingSeconds > 0
                           ? "#403b50"
                           : (unlockMouse.containsMouse ? "#7c3aed" : "#8b5cf6")
                    Behavior on color { ColorAnimation { duration: 150 } }

                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 8

                        Text {
                            text: unlockScreenRoot.lockoutRemainingSeconds > 0
                                  ? qsTr("Aguarde %1s").arg(unlockScreenRoot.lockoutRemainingSeconds)
                                  : qsTr("Desbloquear Synapse")
                            color: "#fffffe"
                            font.pixelSize: 14
                            font.weight: Font.Medium
                        }

                        AppIcon {
                            visible: unlockScreenRoot.lockoutRemainingSeconds === 0
                            name: "arrow-right"
                            color: "#fffffe"
                            width: 15
                            height: 15
                        }
                    }

                    MouseArea {
                        id: unlockMouse
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        hoverEnabled: true
                        enabled: unlockScreenRoot.lockoutRemainingSeconds === 0
                        onClicked: unlockScreenRoot.doUnlock()
                    }
                }

                RowLayout {
                    Layout.alignment: Qt.AlignHCenter
                    spacing: 6

                    AppIcon { name: "shield"; color: "#71717a"; width: 13; height: 13 }
                    Text {
                        text: "PBKDF2-HMAC-SHA256 • AES-256-GCM"
                        color: "#71717a"
                        font.pixelSize: 11
                    }
                }
            }
        }
    }

    AuthLockoutView {
        visible: unlockScreenRoot.lockoutRemainingSeconds > 0
        lockoutSeconds: unlockScreenRoot.lockoutRemainingSeconds
        onCooldownFinished: {
            unlockScreenRoot.lockoutRemainingSeconds = 0
            dataController.refreshVaultLockout()
        }
    }
}
