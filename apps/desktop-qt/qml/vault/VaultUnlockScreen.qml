import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: unlockScreenRoot
    anchors.fill: parent
    color: "#0f0e17" // bg-dark-bg

    signal unlocked()

    property bool isShaking: false

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
        var pass = passwordField.text
        if (pass.trim().length === 0) return

        var success = dataController.unlockVault(pass)
        if (success) {
            passwordField.text = ""
            unlockScreenRoot.unlocked()
        } else {
            unlockScreenRoot.isShaking = true
            shakeAnim.restart()
            passwordField.selectAll()
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
            border.color: "#ffffff12"
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
                    color: "#8b5cf61a"
                    border.color: "#8b5cf640"
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
                        text: "Cofre de Senhas Protegido"
                        color: "#fffffe"
                        font.pixelSize: 22
                        font.bold: true
                    }

                    Text {
                        Layout.fillWidth: true
                        horizontalAlignment: Text.AlignHCenter
                        wrapMode: Text.WordWrap
                        text: "Digite sua senha mestra para descriptografar suas credenciais e notas confidenciais."
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
                    visible: dataController.vaultLockError.length > 0
                    color: "#ef444418"
                    border.color: "#ef444440"
                    border.width: 1

                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 12
                        anchors.rightMargin: 12
                        spacing: 8

                        Text { text: "⚠️"; font.pixelSize: 14 }
                        Text {
                            Layout.fillWidth: true
                            text: dataController.vaultLockError
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
                    border.color: passwordField.activeFocus ? "#8b5cf6" : "#ffffff18"
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
                            placeholderTextColor: "#ffffff40"
                            color: "#fffffe"
                            font.pixelSize: 14
                            echoMode: showPasswordBtn.checked ? TextInput.Normal : TextInput.Password
                            background: null
                            selectByMouse: true
                            focus: true

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
                    color: unlockMouse.containsMouse ? "#7c3aed" : "#8b5cf6"

                    Text {
                        anchors.centerIn: parent
                        text: "Desbloquear Cofre"
                        color: "#fffffe"
                        font.pixelSize: 14
                        font.bold: true
                    }

                    MouseArea {
                        id: unlockMouse
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        hoverEnabled: true
                        onClicked: unlockScreenRoot.doUnlock()
                    }
                }

                // Zero-Knowledge Security Badge
                RowLayout {
                    Layout.alignment: Qt.AlignHCenter
                    spacing: 6

                    Text { text: "🛡️"; font.pixelSize: 12 }
                    Text {
                        text: "PBKDF2 600.000 iterações • AES-256-GCM • Conhecimento Zero"
                        color: "#71717a"
                        font.pixelSize: 11
                    }
                }
            }
        }
    }
}
