import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: practiceRoot
    color: "#0f0e17" // bg-dark-bg

    property var sessions: []
    property var activeSession: null
    property var messages: []
    property var memories: []
    property bool isNewSessionModalOpen: false
    property bool isMemoryDrawerOpen: false
    property bool isHelpOpen: false

    function refreshSessions() {
        sessions = dataController.getPracticeSessions()
        if (activeSession) {
            var exists = false
            for (var i = 0; i < sessions.length; i++) {
                if (sessions[i].id === activeSession.id) {
                    exists = true
                    break
                }
            }
            if (!exists) {
                activeSession = sessions.length > 0 ? sessions[0] : null
            }
        } else if (sessions.length > 0) {
            activeSession = sessions[0]
        }
        if (activeSession) {
            refreshMessages()
        } else {
            messages = []
        }
    }

    function refreshMessages() {
        if (!activeSession) {
            messages = []
            return
        }
        messages = dataController.getPracticeMessages(activeSession.id)
    }

    function refreshMemories() {
        memories = dataController.getPracticeMemories()
    }

    function selectSession(session) {
        activeSession = session
        refreshMessages()
    }

    function sendMessage() {
        var text = msgInput.text.trim()
        if (!activeSession || text.length === 0) return
        msgInput.text = ""
        dataController.createPracticeMessage(activeSession.id, "user", text)
        refreshMessages()

        // Local automated assistant prompt feedback
        responseTimer.restart()
    }

    Timer {
        id: responseTimer
        interval: 400
        onTriggered: {
            if (!activeSession) return
            var reply = "Compreendi seu raciocínio. Vamos analisar os pontos-chave e exercitar mais uma perspectiva sobre este tema."
            if (activeSession.custom_prompt && activeSession.custom_prompt.indexOf("entrevistador") !== -1) {
                reply = "Ótimo ponto técnico! Como você estruturaria essa solução considerando complexidade de tempo O(N) e espaço O(1) em ambiente distribuído?"
            } else if (activeSession.custom_prompt && activeSession.custom_prompt.indexOf("idiomas") !== -1) {
                reply = "Good phrasing! You used natural expressions. How would you elaborate on this idea using past continuous tense?"
            }
            dataController.createPracticeMessage(activeSession.id, "assistant", reply)
            practiceRoot.refreshMessages()
        }
    }

    Component.onCompleted: {
        refreshSessions()
        refreshMemories()
    }

    RowLayout {
        anchors.fill: parent
        spacing: 0

        // Left Sessions Sidebar
        Rectangle {
            Layout.preferredWidth: 280
            Layout.fillHeight: true
            color: "#161524"
            border.color: "#12ffffff"
            border.width: 1

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 16
                spacing: 14

                // Sidebar Header
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8
                    Text { text: "💬"; font.pixelSize: 18 }
                    Text { text: "Sessões"; color: "#fffffe"; font.pixelSize: 16; font.bold: true; Layout.fillWidth: true }
                    Rectangle {
                        width: 76; height: 30; radius: 6; color: "#8b5cf6"
                        Text { anchors.centerIn: parent; text: "+ Nova"; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
                        MouseArea {
                            anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                            onClicked: practiceRoot.isNewSessionModalOpen = true
                        }
                    }
                }

                Rectangle { Layout.fillWidth: true; height: 1; color: "#10ffffff" }

                // Sessions List
                ListView {
                    id: sessionsListView
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    clip: true
                    spacing: 6
                    model: practiceRoot.sessions

                    delegate: Rectangle {
                        required property var modelData
                        width: sessionsListView.width
                        height: 54
                        radius: 8
                        color: (practiceRoot.activeSession && practiceRoot.activeSession.id === modelData.id) ? "#268b5cf6" : (sessMouse.containsMouse ? "#1f1d2e" : "transparent")
                        border.color: (practiceRoot.activeSession && practiceRoot.activeSession.id === modelData.id) ? "#558b5cf6" : "transparent"

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 10
                            spacing: 8

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2
                                Text {
                                    text: modelData.title || "Sessão"
                                    color: (practiceRoot.activeSession && practiceRoot.activeSession.id === modelData.id) ? "#fffffe" : "#c4c4d0"
                                    font.pixelSize: 13
                                    font.bold: true
                                    elide: Text.ElideRight
                                    Layout.fillWidth: true
                                }
                                Text {
                                    text: modelData.started_at ? modelData.started_at.substring(0, 10) : ""
                                    color: "#64748b"
                                    font.pixelSize: 10
                                }
                            }

                            // Delete button
                            Rectangle {
                                width: 26; height: 26; radius: 4; color: delMouse.containsMouse ? "#33f43f5e" : "transparent"
                                Text { anchors.centerIn: parent; text: "🗑️"; font.pixelSize: 11 }
                                MouseArea {
                                    id: delMouse
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        dataController.deletePracticeSession(modelData.id)
                                        practiceRoot.refreshSessions()
                                    }
                                }
                            }
                        }

                        MouseArea {
                            id: sessMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            z: -1
                            onClicked: practiceRoot.selectSession(modelData)
                        }
                    }

                    // Empty state
                    Text {
                        anchors.centerIn: parent
                        visible: practiceRoot.sessions.length === 0
                        text: "Nenhuma sessão ainda.\nClique em '+ Nova'."
                        color: "#64748b"
                        font.pixelSize: 12
                        horizontalAlignment: Text.AlignHCenter
                    }
                }
            }
        }

        // Right Main Content (Active Chat)
        Rectangle {
            Layout.fillWidth: true
            Layout.fillHeight: true
            color: "#0f0e17"

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
                            text: practiceRoot.activeSession ? practiceRoot.activeSession.title : "Nenhuma sessão ativa"
                            color: "#fffffe"
                            font.pixelSize: 16
                            font.bold: true
                            elide: Text.ElideRight
                            Layout.fillWidth: true
                        }

                        Rectangle {
                            visible: practiceRoot.activeSession && Boolean(practiceRoot.activeSession.custom_prompt)
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
                                Text { id: memText; text: "Memórias (" + practiceRoot.memories.length + ")"; color: "#fffffe"; font.pixelSize: 11; font.bold: true }
                            }
                            MouseArea {
                                id: memMouse
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: practiceRoot.isMemoryDrawerOpen = !practiceRoot.isMemoryDrawerOpen
                            }
                        }

                        Rectangle {
                            width: 32; height: 32; radius: 8; color: "#211f30"
                            Text { anchors.centerIn: parent; text: "?"; color: "#a7a9be"; font.pixelSize: 14; font.bold: true }
                            MouseArea {
                                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                onClicked: practiceRoot.isHelpOpen = true
                            }
                        }
                    }
                }

                // Chat Messages Transcript
                ListView {
                    id: messagesList
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    Layout.margins: 16
                    clip: true
                    spacing: 12
                    model: practiceRoot.messages

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
                        visible: practiceRoot.messages.length === 0 && Boolean(practiceRoot.activeSession)
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
                            onAccepted: practiceRoot.sendMessage()
                        }

                        Rectangle {
                            width: 80; height: 38; radius: 8; color: "#8b5cf6"
                            Text { anchors.centerIn: parent; text: "Enviar"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                            MouseArea {
                                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                onClicked: practiceRoot.sendMessage()
                            }
                        }
                    }
                }
            }
        }
    }

    // Memory Drawer Overlay
    Rectangle {
        anchors.fill: parent
        color: "#99000000"
        visible: practiceRoot.isMemoryDrawerOpen
        z: 110

        MouseArea {
            anchors.fill: parent
            onClicked: practiceRoot.isMemoryDrawerOpen = false
        }

        Rectangle {
            anchors.top: parent.top
            anchors.bottom: parent.bottom
            anchors.right: parent.right
            width: Math.min(420, parent.width - 40)
            color: "#161524"
            border.color: "#18ffffff"
            border.width: 1

            MouseArea { anchors.fill: parent }

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 20
                spacing: 16

                RowLayout {
                    Layout.fillWidth: true
                    Text { text: "🧠 Memórias do Tutor"; color: "#fffffe"; font.pixelSize: 16; font.bold: true; Layout.fillWidth: true }
                    Rectangle {
                        width: 28; height: 28; radius: 6; color: "#211f30"
                        Text { anchors.centerIn: parent; text: "×"; color: "#a7a9be"; font.pixelSize: 16 }
                        MouseArea {
                            anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                            onClicked: practiceRoot.isMemoryDrawerOpen = false
                        }
                    }
                }

                Text {
                    text: "Fatos permanentes que orientam o tutor em todas as sessões."
                    color: "#a7a9be"
                    font.pixelSize: 12
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8
                    TextField {
                        id: memoryInput
                        Layout.fillWidth: true
                        placeholderText: "Ex: Prefiro explicações com diagramas..."
                        color: "#ffffff"
                        background: Rectangle { color: "#0f0e17"; border.color: "#18ffffff"; radius: 8 }
                    }
                    Rectangle {
                        width: 72; height: 36; radius: 8; color: "#8b5cf6"
                        Text { anchors.centerIn: parent; text: "+ Salvar"; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
                        MouseArea {
                            anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                var txt = memoryInput.text.trim()
                                if (txt.length > 0) {
                                    dataController.createPracticeMemory(txt, "general")
                                    memoryInput.text = ""
                                    practiceRoot.refreshMemories()
                                }
                            }
                        }
                    }
                }

                ListView {
                    id: memListView
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    clip: true
                    spacing: 8
                    model: practiceRoot.memories

                    delegate: Rectangle {
                        required property var modelData
                        width: memListView.width
                        height: memRow.implicitHeight + 16
                        radius: 8
                        color: "#08ffffff"
                        border.color: "#10ffffff"

                        RowLayout {
                            id: memRow
                            anchors.fill: parent
                            anchors.margins: 10
                            spacing: 8
                            Text {
                                text: modelData.fact || ""
                                color: "#fffffe"
                                font.pixelSize: 12
                                wrapMode: Text.Wrap
                                Layout.fillWidth: true
                            }
                            Rectangle {
                                width: 24; height: 24; radius: 4; color: "#20f43f5e"
                                Text { anchors.centerIn: parent; text: "🗑️"; font.pixelSize: 10 }
                                MouseArea {
                                    anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        dataController.deletePracticeMemory(modelData.id)
                                        practiceRoot.refreshMemories()
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    NewPracticeSessionModal {
        visible: practiceRoot.isNewSessionModalOpen
        onClosed: practiceRoot.isNewSessionModalOpen = false
        onSessionCreated: function(title, prompt) {
            var newId = dataController.createPracticeSession(title, prompt)
            practiceRoot.isNewSessionModalOpen = false
            practiceRoot.refreshSessions()
            if (newId) {
                practiceRoot.selectSession({ id: newId, title: title, custom_prompt: prompt })
            }
        }
    }

    PracticeHelpDialog {
        isOpen: practiceRoot.isHelpOpen
        onClosed: practiceRoot.isHelpOpen = false
    }

    Shortcut {
        sequence: "Escape"
        enabled: practiceRoot.isHelpOpen || practiceRoot.isMemoryDrawerOpen || practiceRoot.isNewSessionModalOpen
        onActivated: {
            if (practiceRoot.isHelpOpen) practiceRoot.isHelpOpen = false
            else if (practiceRoot.isMemoryDrawerOpen) practiceRoot.isMemoryDrawerOpen = false
            else if (practiceRoot.isNewSessionModalOpen) practiceRoot.isNewSessionModalOpen = false
        }
    }
}

