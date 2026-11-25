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
    property var sessions: []
    property string activeSessionId: ""
    property var attachedPages: []
    property var chatMessages: [
        { role: "assistant", messageText: "Olá! Sou seu assistente de estudos Synapse. Como posso ajudar você hoje?", timestamp: "Agora" }
    ]
    property bool isGenerating: false
    property var availablePages: []

    signal closeRequested()
    signal insertIntoNoteRequested(string text)

    function loadSessions() {
        if (!dataCtrl) return
        try {
            var raw = dataCtrl.getConfig("ai_chat_sessions_v1", "[]")
            var parsed = JSON.parse(raw)
            if (Array.isArray(parsed) && parsed.length > 0) {
                sessions = parsed
                activeSessionId = parsed[0].id
                chatMessages = parsed[0].messages || []
                return
            }
        } catch (e) {}
        createNewSession()
    }

    function createNewSession() {
        var newSess = {
            id: "ai-" + Date.now(),
            title: qsTr("Nova Conversa"),
            messages: [
                { role: "assistant", messageText: qsTr("Olá! Sou seu assistente de estudos Synapse. Como posso ajudar você hoje?"), timestamp: "Agora" }
            ]
        }
        var next = [newSess].concat(sessions)
        sessions = next.slice(0, 25)
        activeSessionId = newSess.id
        chatMessages = newSess.messages
        saveSessions()
    }

    function saveSessions() {
        if (!dataCtrl) return
        var next = sessions.slice()
        for (var i = 0; i < next.length; i++) {
            if (next[i].id === activeSessionId) {
                var firstUser = ""
                for (var m = 0; m < chatMessages.length; m++) {
                    if (chatMessages[m].role === "user") { firstUser = chatMessages[m].messageText; break }
                }
                next[i] = {
                    id: next[i].id,
                    title: firstUser ? String(firstUser).substring(0, 34) : next[i].title,
                    messages: chatMessages
                }
                break
            }
        }
        sessions = next
        dataCtrl.setConfig("ai_chat_sessions_v1", JSON.stringify(sessions))
    }

    Component.onCompleted: loadSessions()

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
                text: qsTr("Chats")
                flat: true
                onClicked: sessionListPopup.visible = !sessionListPopup.visible
                background: Rectangle { radius: 6; color: parent.hovered ? "#232135" : "#1a1829" }
                contentItem: Text { text: parent.text; color: "#c4b5fd"; font.pixelSize: 11; font.bold: true }
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
                    onCopyRequested: function(txt) {
                        if (sidebarRoot.dataCtrl && typeof sidebarRoot.dataCtrl.copyLinkUrlToClipboard === "function") {
                            sidebarRoot.dataCtrl.copyLinkUrlToClipboard(txt)
                        }
                    }
                    onInsertIntoNoteRequested: function(txt) { sidebarRoot.insertIntoNoteRequested(txt) }
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

        // Attached Pages Context Pills
        Flow {
            visible: sidebarRoot.attachedPages.length > 0
            Layout.fillWidth: true
            spacing: 6
            Repeater {
                model: sidebarRoot.attachedPages
                delegate: Rectangle {
                    required property var modelData
                    required property int index
                    height: 24
                    width: pillRow.implicitWidth + 14
                    radius: 12
                    color: "#228b5cf6"
                    border.color: "#448b5cf6"
                    RowLayout {
                        id: pillRow
                        anchors.centerIn: parent
                        spacing: 5
                        Text { text: (modelData.icon || "📄") + " " + (modelData.title || ""); color: "#ddd6fe"; font.pixelSize: 10 }
                        Text {
                            text: "×"
                            color: "#a78bfa"
                            font.pixelSize: 11
                            font.bold: true
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    var next = sidebarRoot.attachedPages.slice()
                                    next.splice(index, 1)
                                    sidebarRoot.attachedPages = next
                                }
                            }
                        }
                    }
                }
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
        var contextStr = ""
        if (dataCtrl && attachedPages.length > 0) {
            var chunks = []
            for (var p = 0; p < attachedPages.length; p++) {
                var pageObj = dataCtrl.getPage(attachedPages[p].id)
                if (pageObj && pageObj.id) {
                    var plain = String(pageObj.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().substring(0, 3000)
                    chunks.push("=== Página anexada: " + (pageObj.title || "") + " ===\n" + plain)
                }
            }
            if (chunks.length > 0) contextStr = chunks.join("\n\n") + "\n\n"
        }

        var msgs = [...chatMessages]
        msgs.push({
            role: "user",
            messageText: text,
            timestamp: "Agora"
        })
        chatMessages = msgs
        saveSessions()
        msgList.positionViewAtEnd()
        isGenerating = true

        var sysPrompt = "Você é o assistente inteligente do Synapse para estudos e anotações. Ajude com resumos, perguntas e explicações claras e didáticas."
        aiClient.promptText(sysPrompt, contextStr + text, chatMessages.slice(0, -1), function(success, replyText, errorMsg) {
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
            sidebarRoot.saveSessions()
            msgList.positionViewAtEnd()
        })
    }

    AiChatSessionList {
        id: sessionListPopup
        anchors.top: parent.top
        anchors.topMargin: 52
        anchors.right: parent.right
        anchors.rightMargin: 12
        sessions: sidebarRoot.sessions
        activeSessionId: sidebarRoot.activeSessionId
        onSessionSelected: function(sid) {
            for (var i = 0; i < sidebarRoot.sessions.length; i++) {
                if (sidebarRoot.sessions[i].id === sid) {
                    sidebarRoot.activeSessionId = sid
                    sidebarRoot.chatMessages = sidebarRoot.sessions[i].messages || []
                    sessionListPopup.visible = false
                    break
                }
            }
        }
        onNewSessionRequested: sidebarRoot.createNewSession()
        onDeleteSessionRequested: function(sid) {
            var next = sidebarRoot.sessions.filter(function(s) { return s.id !== sid })
            sidebarRoot.sessions = next
            if (next.length === 0) sidebarRoot.createNewSession()
            else {
                sidebarRoot.activeSessionId = next[0].id
                sidebarRoot.chatMessages = next[0].messages || []
                sidebarRoot.saveSessions()
            }
        }
        onCloseRequested: sessionListPopup.visible = false
    }

    // Mention Popup (Floats above input bar, anchored to parent)
    AiPageMentionMenu {
        id: mentionMenu
        anchors.bottom: parent.bottom
        anchors.bottomMargin: inputRect.height + 18
        anchors.left: parent.left
        anchors.leftMargin: 12
        pagesList: sidebarRoot.availablePages
        onPageSelected: function(pageId, pageTitle) {
            var txt = promptInput.text
            var lastAt = txt.lastIndexOf("@")
            if (lastAt >= 0) promptInput.text = txt.substring(0, lastAt) + "@" + pageTitle + " "
            else promptInput.text += "@" + pageTitle + " "
            promptInput.cursorPosition = promptInput.text.length
            var exists = sidebarRoot.attachedPages.some(function(it) { return it.id === pageId })
            if (!exists) {
                var next = sidebarRoot.attachedPages.slice()
                next.push({ id: pageId, title: pageTitle, icon: "📄" })
                sidebarRoot.attachedPages = next
            }
        }
    }
}
