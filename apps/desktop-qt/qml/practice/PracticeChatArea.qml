import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: chatAreaRoot
    Layout.fillWidth: true
    Layout.fillHeight: true
    color: "#0f0e17"

    property var activeSession: null
    property var messages: []
    property int memoryCount: 0
    property bool isVoiceCallActive: false

    signal sendMessageRequested(string text)
    signal voiceCallToggled()
    signal micTestRequested()
    signal memoryDrawerToggled()
    signal helpRequested()
    signal endCallRequested()

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        // Session Header
        Rectangle {
            Layout.fillWidth: true
            height: 58
            color: "#161524"
            border.color: "#12ffffff"
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.margins: 14
                spacing: 12

                Text {
                    text: chatAreaRoot.activeSession ? chatAreaRoot.activeSession.title : "Nenhuma sessão ativa"
                    color: "#fffffe"
                    font.pixelSize: 16
                    font.bold: true
                    elide: Text.ElideRight
                    Layout.fillWidth: true
                }

                Rectangle {
                    visible: chatAreaRoot.activeSession && Boolean(chatAreaRoot.activeSession.custom_prompt)
                    height: 24
                    radius: 12
                    color: "#208b5cf6"
                    border.color: "#408b5cf6"
                    Layout.preferredWidth: promptBadge.implicitWidth + 14
                    Text {
                        id: promptBadge
                        anchors.centerIn: parent
                        text: "Prompt Ativo"
                        color: "#c4b5fd"
                        font.pixelSize: 10
                        font.bold: true
                    }
                }

                Rectangle {
                    height: 32
                    radius: 8
                    color: memMouse.containsMouse ? "#268b5cf6" : "#211f30"
                    border.color: "#18ffffff"
                    Layout.preferredWidth: memText.implicitWidth + 20
                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 6
                        Text { text: "🧠"; font.pixelSize: 12 }
                        Text { id: memText; text: "Memórias (" + chatAreaRoot.memoryCount + ")"; color: "#fffffe"; font.pixelSize: 11; font.bold: true }
                    }
                    MouseArea {
                        id: memMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: chatAreaRoot.memoryDrawerToggled()
                    }
                }

                // Voice call trigger
                Rectangle {
                    height: 32
                    radius: 8
                    color: voiceBtnMouse.containsMouse ? "#7c3aed" : "#8b5cf6"
                    Layout.preferredWidth: voiceBtnText.implicitWidth + 20
                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 4
                        Text { text: "🎙️"; font.pixelSize: 12 }
                        Text { id: voiceBtnText; text: chatAreaRoot.isVoiceCallActive ? "Em Chamada" : "Chamada de Voz"; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
                    }
                    MouseArea {
                        id: voiceBtnMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: chatAreaRoot.voiceCallToggled()
                    }
                }

                // Mic test button
                Rectangle {
                    height: 32
                    radius: 8
                    color: micTestMouse.containsMouse ? "#268b5cf6" : "#211f30"
                    border.color: "#18ffffff"
                    Layout.preferredWidth: micTestText.implicitWidth + 18
                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 4
                        Text { text: "🎤"; font.pixelSize: 11 }
                        Text { id: micTestText; text: "Testar Mic"; color: "#d4d4d8"; font.pixelSize: 11 }
                    }
                    MouseArea {
                        id: micTestMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: chatAreaRoot.micTestRequested()
                    }
                }

                Rectangle {
                    width: 32; height: 32; radius: 8; color: "#211f30"
                    Text { anchors.centerIn: parent; text: "?"; color: "#a7a9be"; font.pixelSize: 14; font.bold: true }
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: chatAreaRoot.helpRequested()
                    }
                }
            }
        }

        // Active Voice Call Bar
        PracticeCallBar {
            Layout.fillWidth: true
            Layout.leftMargin: 16
            Layout.rightMargin: 16
            Layout.topMargin: 8
            visible: chatAreaRoot.isVoiceCallActive
            isCallActive: chatAreaRoot.isVoiceCallActive
            activeModeName: chatAreaRoot.activeSession ? chatAreaRoot.activeSession.title : "Chamada com IA"
            onEndCallRequested: chatAreaRoot.endCallRequested()
        }

        // Chat Messages Transcript
        ListView {
            id: messagesList
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.margins: 16
            clip: true
            spacing: 12
            model: chatAreaRoot.messages

            delegate: Item {
                required property var modelData
                width: messagesList.width
                height: bubbleRect.implicitHeight + 8

                Rectangle {
                    id: bubbleRect
                    anchors.right: modelData.role === "user" ? parent.right : undefined
                    anchors.left: modelData.role === "user" ? undefined : parent.left
                    width: Math.min(messagesList.width * 0.72, msgText.implicitWidth + 28)
                    implicitHeight: msgText.implicitHeight + 20
                    radius: 12
                    color: modelData.role === "user" ? "#268b5cf6" : "#1a1924"
                    border.color: modelData.role === "user" ? "#508b5cf6" : "#14ffffff"

                    Text {
                        id: msgText
                        anchors.fill: parent
                        anchors.margins: 10
                        text: modelData.text_content || ""
                        color: "#fffffe"
                        font.pixelSize: 13
                        wrapMode: Text.Wrap
                        lineHeight: 1.3
                    }
                }
            }

            // Empty transcript state
            Text {
                anchors.centerIn: parent
                visible: chatAreaRoot.messages.length === 0 && Boolean(chatAreaRoot.activeSession)
                text: "Inicie a conversa digitando sua pergunta ou tema abaixo."
                color: "#64748b"
                font.pixelSize: 13
            }
        }

        // Message Input Dock
        Rectangle {
            Layout.fillWidth: true
            height: 64
            color: "#161524"
            border.color: "#12ffffff"
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.margins: 12
                spacing: 10

                TextField {
                    id: msgInput
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    placeholderText: "Digite sua mensagem para o tutor..."
                    color: "#ffffff"
                    background: Rectangle { color: "#0f0e17"; border.color: msgInput.activeFocus ? "#8b5cf6" : "#18ffffff"; radius: 8 }
                    onAccepted: {
                        var txt = msgInput.text.trim()
                        if (txt.length > 0) {
                            msgInput.text = ""
                            chatAreaRoot.sendMessageRequested(txt)
                        }
                    }
                }

                Rectangle {
                    width: 80; height: 38; radius: 8; color: "#8b5cf6"
                    Text { anchors.centerIn: parent; text: "Enviar"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            var txt = msgInput.text.trim()
                            if (txt.length > 0) {
                                msgInput.text = ""
                                chatAreaRoot.sendMessageRequested(txt)
                            }
                        }
                    }
                }
            }
        }
    }
}
