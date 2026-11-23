import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15
import "../ui"

Rectangle {
    id: sidebarRoot
    width: 360
    color: "#161524"
    border.color: "#232135"
    border.width: 1
    visible: false
    z: 90

    property var dataCtrl: typeof dataController !== "undefined" ? dataController : null
    property var chatMessages: [
        { role: "assistant", messageText: "Olá! Sou seu assistente de estudos Synapse. Como posso ajudar você hoje?", timestamp: "Agora" }
    ]
    property bool isGenerating: false
    property var availablePages: []

    signal closeRequested()

    // Left Resize Handle
    Rectangle {
        id: resizeHandle
        width: 5
        anchors.left: parent.left
        anchors.top: parent.top
        anchors.bottom: parent.bottom
        color: resizeMouse.containsMouse ? "#8b5cf6" : "transparent"

        MouseArea {
            id: resizeMouse
            anchors.fill: parent
            cursorShape: Qt.SizeHorCursor
            hoverEnabled: true
            drag.target: null

            property int startX: 0
            property int startWidth: 360

            onPressed: function(mouse) {
                startX = mouse.x
                startWidth = sidebarRoot.width
            }
            onPositionChanged: function(mouse) {
                if (pressed) {
                    var newWidth = sidebarRoot.width - (mouse.x - startX)
                    sidebarRoot.width = Math.min(560, Math.max(280, newWidth))
                }
            }
            onDoubleClicked: sidebarRoot.width = 360
        }
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.leftMargin: 8
        anchors.rightMargin: 12
        anchors.topMargin: 12
        anchors.bottomMargin: 12
        spacing: 12

        // Header
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Rectangle {
                width: 28
                height: 28
                radius: 7
                color: "#8b5cf6"
                Text { anchors.centerIn: parent; text: "✨"; font.pixelSize: 14 }
            }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 1
                Text { text: "Synapse AI Tutor"; color: "#fffffe"; font.pixelSize: 14; font.bold: true }
                Text { text: "Assistente de contexto & aprendizado"; color: "#94a1b2"; font.pixelSize: 10 }
            }

            Button {
                text: "✕"
                flat: true
                contentItem: Text { text: "✕"; color: "#94a1b2"; font.pixelSize: 13 }
                onClicked: sidebarRoot.closeRequested()
            }
        }

        // Messages List
        Rectangle {
            Layout.fillWidth: true
            Layout.fillHeight: true
            color: "#11101a"
            radius: 8
            border.color: "#232135"

            ListView {
                id: msgList
                anchors.fill: parent
                anchors.margins: 10
                clip: true
                spacing: 10
                model: sidebarRoot.chatMessages

                delegate: AiChatMessageItem {
                    role: modelData.role || "user"
                    messageText: modelData.messageText || ""
                    timestamp: modelData.timestamp || ""
                }
            }

            // Typing indicator
            Rectangle {
                anchors.bottom: parent.bottom
                anchors.left: parent.left
                anchors.margins: 10
                width: 100
                height: 24
                radius: 12
                color: "#1f1d2e"
                visible: sidebarRoot.isGenerating

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 4
                    Text { text: "Digitando..."; color: "#8b5cf6"; font.pixelSize: 11; font.bold: true }
                }
            }
        }

        // Quick Suggestions
        RowLayout {
            Layout.fillWidth: true
            spacing: 6
            visible: sidebarRoot.chatMessages.length <= 1

            Button {
                text: "💡 Resumir página"
                Layout.fillWidth: true
                background: Rectangle { color: "#1f1d2e"; radius: 6; border.color: "#2e2b44" }
                contentItem: Text { text: parent.text; color: "#fffffe"; font.pixelSize: 10; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                onClicked: sendPrompt("Por favor, resuma os pontos principais do conteúdo atual.")
            }

            Button {
                text: "🎯 Gerar simulado"
                Layout.fillWidth: true
                background: Rectangle { color: "#1f1d2e"; radius: 6; border.color: "#2e2b44" }
                contentItem: Text { text: parent.text; color: "#fffffe"; font.pixelSize: 10; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                onClicked: sendPrompt("Crie 3 questões de teste com gabarito sobre o tema desta página.")
            }
        }

        // Bottom Input Bar
        Rectangle {
            id: inputRect
            Layout.fillWidth: true
            height: 48
            radius: 8
            color: "#1f1d2e"
            border.color: promptInput.activeFocus ? "#8b5cf6" : "#2e2b44"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 10
                anchors.rightMargin: 6
                spacing: 6

                TextField {
                    id: promptInput
                    Layout.fillWidth: true
                    placeholderText: "Pergunte algo ou use @ para citar página..."
                    color: "#fffffe"
                    font.pixelSize: 12
                    background: null

                    onTextChanged: {
                        var txt = promptInput.text
                        var lastAt = txt.lastIndexOf("@")
                        if (lastAt !== -1 && lastAt === txt.length - 1) {
                            mentionMenu.filterQuery = ""
                            mentionMenu.visible = true
                        } else if (lastAt !== -1 && lastAt < txt.length - 1 && !txt.endsWith(" ")) {
                            mentionMenu.filterQuery = txt.substring(lastAt + 1)
                            mentionMenu.visible = true
                        } else {
                            mentionMenu.visible = false
                        }
                    }

                    onAccepted: handleSend()
                }

                Button {
                    text: "➤"
                    Layout.preferredWidth: 34
                    Layout.preferredHeight: 34
                    background: Rectangle {
                        color: promptInput.text.trim().length > 0 ? "#8b5cf6" : "#2e2b44"
                        radius: 6
                    }
                    contentItem: Text {
                        text: parent.text
                        color: "#ffffff"
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: handleSend()
                }
            }
        }
    }

    AiClient {
        id: aiClient
        dataController: sidebarRoot.dataCtrl
    }

    function handleSend() {
        var txt = promptInput.text.trim()
        if (txt.length === 0 || isGenerating) return
        sendPrompt(txt)
        promptInput.text = ""
        mentionMenu.visible = false
    }

    function sendPrompt(text) {
        var msgs = [...chatMessages]
        msgs.push({
            role: "user",
            messageText: text,
            timestamp: "Agora"
        })
        chatMessages = msgs
        msgList.positionViewAtEnd()
        isGenerating = true

        var sysPrompt = "Você é o assistente inteligente do Synapse para estudos e anotações. Ajude com resumos, perguntas e explicações claras e didáticas."
        aiClient.promptText(sysPrompt, text, chatMessages.slice(0, -1), function(success, replyText, errorMsg) {
            sidebarRoot.isGenerating = false
            var updated = [...sidebarRoot.chatMessages]
            if (success) {
                updated.push({
                    role: "assistant",
                    messageText: replyText,
                    timestamp: "Agora"
                })
            } else {
                updated.push({
                    role: "assistant",
                    messageText: "⚠️ " + errorMsg,
                    timestamp: "Agora"
                })
            }
            sidebarRoot.chatMessages = updated
            msgList.positionViewAtEnd()
        })
    }

    // Mention Popup (Floats above input bar, outside ColumnLayout)
    AiPageMentionMenu {
        id: mentionMenu
        anchors.bottom: inputRect.top
        anchors.bottomMargin: 6
        anchors.left: inputRect.left
        pagesList: sidebarRoot.availablePages
        onPageSelected: function(pageId, pageTitle) {
            promptInput.text += pageTitle + " "
            promptInput.cursorPosition = promptInput.text.length
        }
    }
}
