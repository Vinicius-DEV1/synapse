import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../auth"

Rectangle {
    id: unlockScreenRoot
    anchors.fill: parent
    color: "#0f0e17" // bg-dark-bg

    signal unlocked()

    property bool isShaking: false
    property int lockoutRemainingSeconds: dataController.vaultUnlockRemainingSeconds

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

    Item {
        id: cardContainer
        width: 440
        height: cardLayout.implicitHeight + 64
        anchors.centerIn: parent
        property real originalX: (parent.width - width) / 2

        Rectangle {
            anchors.fill: parent
            radius: 16
            color: "#1a1924"
            border.color: "#12ffffff"
            border.width: 1

            ColumnLayout {
                id: cardLayout
                anchors.fill: parent
                anchors.margins: 32
                spacing: 20

                // Padlock Icon
                Rectangle {
                    Layout.alignment: Qt.AlignHCenter
                    width: 64
                    height: 64
                    radius: 32
                    color: "#1a8b5cf6"
                    border.color: "#408b5cf6"
                    border.width: 1

                    Text {
                        anchors.centerIn: parent
                        text: "🔒"
                        font.pixelSize: 28
                    }
                }

                // Title and Subtitle
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 6

                    Text {
                        Layout.alignment: Qt.AlignHCenter
                        text: "Synapse is locked"
                        color: "#fffffe"
                        font.pixelSize: 22
                        font.bold: true
                    }

                    Text {
                        Layout.fillWidth: true
                        horizontalAlignment: Text.AlignHCenter
                        wrapMode: Text.WordWrap
                        text: "Enter your master password to open your workspace."
                        color: "#a7a9be"
                        font.pixelSize: 13
                        lineHeight: 1.3
                    }
                }

                // Error Banner
                Rectangle {
                    Layout.fillWidth: true
                    height: 38
                    radius: 8
                    visible: dataController.vaultLockError.length > 0 || unlockScreenRoot.lockoutRemainingSeconds > 0
                    color: "#18ef4444"
                    border.color: "#40ef4444"
                    border.width: 1

                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 12
                        anchors.rightMargin: 12
                        spacing: 8

                        Text { text: "⚠️"; font.pixelSize: 14 }
                        Text {
                            Layout.fillWidth: true
                            text: unlockScreenRoot.lockoutRemainingSeconds > 0
                                  ? qsTr("Too many failed attempts. Try again in %1 seconds.").arg(unlockScreenRoot.lockoutRemainingSeconds)
                                  : dataController.vaultLockError
                            color: "#fca5a5"
                            font.pixelSize: 12
                            elide: Text.ElideRight
                        }
                    }
                }

                // Password Input Field
                Rectangle {
                    Layout.fillWidth: true
                    height: 48
                    radius: 10
                    color: "#201e30"
                    border.color: passwordField.activeFocus ? "#8b5cf6" : "#18ffffff"
                    border.width: passwordField.activeFocus ? 2 : 1

                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 14
                        anchors.rightMargin: 10
                        spacing: 8

                        TextField {
                            id: passwordField
                            Layout.fillWidth: true
                            placeholderText: "Digite sua senha mestra..."
                            placeholderTextColor: "#40ffffff"
                            color: "#fffffe"
                            font.pixelSize: 14
                            echoMode: showPasswordBtn.checked ? TextInput.Normal : TextInput.Password
                            background: null
                            selectByMouse: true
                            focus: true
                            enabled: unlockScreenRoot.lockoutRemainingSeconds === 0

                            Keys.onReturnPressed: unlockScreenRoot.doUnlock()
                        }

                        Button {
                            id: showPasswordBtn
                            checkable: true
                            flat: true
                            width: 32
                            height: 32
                            background: null

                            contentItem: Text {
                                text: showPasswordBtn.checked ? "👁️" : "🙈"
                                font.pixelSize: 16
                                horizontalAlignment: Text.AlignHCenter
                                verticalAlignment: Text.AlignVCenter
                            }
                        }
                    }
                }

                // Unlock Button
                Rectangle {
                    Layout.fillWidth: true
                    height: 46
                    radius: 10
                    color: unlockScreenRoot.lockoutRemainingSeconds > 0
                           ? "#403b50" : unlockMouse.containsMouse ? "#7c3aed" : "#8b5cf6"

                    Text {
                        anchors.centerIn: parent
                        text: unlockScreenRoot.lockoutRemainingSeconds > 0
                              ? qsTr("Wait %1 seconds").arg(unlockScreenRoot.lockoutRemainingSeconds)
                              : qsTr("Unlock Synapse")
                        color: "#fffffe"
                        font.pixelSize: 14
                        font.bold: true
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

                // Zero-Knowledge Security Badge
                RowLayout {
                    Layout.alignment: Qt.AlignHCenter
                    spacing: 6

                    Text { text: "🛡️"; font.pixelSize: 12 }
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
