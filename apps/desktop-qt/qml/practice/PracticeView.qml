import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: practiceRoot
    color: "#0f0e17" // bg-dark-bg

    AiClient {
        id: aiClient
        dataController: typeof dataController !== "undefined" ? dataController : null
    }

    property var sessions: []
    property var activeSession: null
    property var messages: []
    property var memories: []
    property bool isNewSessionModalOpen: false
    property bool isMemoryDrawerOpen: false
    property bool isHelpOpen: false
    property bool isVoiceCallActive: false
    property bool isFeedbackOpen: false
    property bool isMicTestOpen: false
    property bool isInterviewSetupOpen: false

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

    function sendMessage(text) {
        if (!activeSession || !text || text.trim().length === 0) return
        var cleanText = text.trim()
        dataController.createPracticeMessage(activeSession.id, "user", cleanText)
        refreshMessages()

        var sysPrompt = activeSession.custom_prompt || "Você é um tutor prático e examinador de estudos no Synapse. Avalie a resposta do aluno e proponha novos desafios conceituais ou práticos."
        aiClient.promptText(sysPrompt, cleanText, messages, function(success, replyText, errorMsg) {
            if (!activeSession) return
            var reply = ""
            if (success) {
                reply = replyText
            } else {
                if (activeSession.custom_prompt && activeSession.custom_prompt.indexOf("entrevistador") !== -1) {
                    reply = "Ótimo ponto técnico! Como você estruturaria essa solução considerando complexidade de tempo O(N) e espaço O(1) em ambiente distribuído?"
                } else if (activeSession.custom_prompt && activeSession.custom_prompt.indexOf("idiomas") !== -1) {
                    reply = "Good phrasing! You used natural expressions. How would you elaborate on this idea using past continuous tense?"
                } else {
                    reply = "Compreendi seu raciocínio. Vamos analisar os pontos-chave e exercitar mais uma perspectiva sobre este tema."
                }
                if (errorMsg && errorMsg.indexOf("não configurada") !== -1) {
                    reply += "\n\n*(Dica: configure sua chave de API Gemini em Configurações > IA para respostas dinâmicas em tempo real)*"
                }
            }
            dataController.createPracticeMessage(activeSession.id, "assistant", reply)
            practiceRoot.refreshMessages()
        })
    }

    Component.onCompleted: {
        refreshSessions()
        refreshMemories()
    }

    RowLayout {
        anchors.fill: parent
        spacing: 0

        PracticeSidebar {
            sessions: practiceRoot.sessions
            activeSession: practiceRoot.activeSession
            onSessionSelected: function(session) { practiceRoot.selectSession(session) }
            onNewSessionRequested: practiceRoot.isNewSessionModalOpen = true
            onDeleteRequested: function(id, title) {
                practiceDeleteModal.itemId = id
                practiceDeleteModal.itemTitle = title
                practiceDeleteModal.deleteType = "session"
                practiceDeleteModal.isOpen = true
            }
        }

        PracticeChatArea {
            activeSession: practiceRoot.activeSession
            messages: practiceRoot.messages
            memoryCount: practiceRoot.memories.length
            isVoiceCallActive: practiceRoot.isVoiceCallActive
            onSendMessageRequested: function(text) { practiceRoot.sendMessage(text) }
            onVoiceCallToggled: {
                if (practiceRoot.isVoiceCallActive) {
                    practiceRoot.isVoiceCallActive = false
                    practiceRoot.isFeedbackOpen = true
                } else {
                    practiceRoot.isInterviewSetupOpen = true
                }
            }
            onEndCallRequested: {
                practiceRoot.isVoiceCallActive = false
                practiceRoot.isFeedbackOpen = true
            }
            onMicTestRequested: practiceRoot.isMicTestOpen = true
            onMemoryDrawerToggled: practiceRoot.isMemoryDrawerOpen = !practiceRoot.isMemoryDrawerOpen
            onHelpRequested: practiceRoot.isHelpOpen = true
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
                                        practiceDeleteModal.itemId = modelData.id
                                        practiceDeleteModal.itemTitle = qsTr("Instrução de Memória")
                                        practiceDeleteModal.deleteType = "memory"
                                        practiceDeleteModal.isOpen = true
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

    PracticeInterviewSetupModal {
        visible: practiceRoot.isInterviewSetupOpen
        onCloseRequested: practiceRoot.isInterviewSetupOpen = false
        onSessionConfigured: function(title, mode, diff, lang, contextNotes) {
            var fullPrompt = "Modo: " + mode + " | Nível: " + diff + " | Idioma: " + lang + (contextNotes ? "\nContexto: " + contextNotes : "")
            var newId = dataController.createPracticeSession(title, fullPrompt)
            practiceRoot.isInterviewSetupOpen = false
            practiceRoot.refreshSessions()
            if (newId) {
                practiceRoot.selectSession({ id: newId, title: title, custom_prompt: fullPrompt })
            }
            practiceRoot.isVoiceCallActive = true
        }
    }

    PracticeInterviewFeedbackModal {
        visible: practiceRoot.isFeedbackOpen
        sessionTitle: practiceRoot.activeSession ? practiceRoot.activeSession.title : "Sessão de Prática"
        onCloseRequested: practiceRoot.isFeedbackOpen = false
    }

    PracticeMicTest {
        visible: practiceRoot.isMicTestOpen
        onCloseRequested: practiceRoot.isMicTestOpen = false
    }

    PracticeDeleteModal {
        id: practiceDeleteModal
        onConfirmed: function(id, type) {
            if (type === "session") {
                dataController.deletePracticeSession(id)
                practiceRoot.refreshSessions()
            } else if (type === "memory") {
                dataController.deletePracticeMemory(id)
                practiceRoot.refreshMemories()
            }
            practiceDeleteModal.isOpen = false
        }
        onCancelled: practiceDeleteModal.isOpen = false
    }

    Shortcut {
        sequence: "Escape"
        enabled: practiceRoot.isHelpOpen || practiceRoot.isMemoryDrawerOpen || practiceRoot.isNewSessionModalOpen || practiceRoot.isInterviewSetupOpen || practiceRoot.isFeedbackOpen || practiceRoot.isMicTestOpen || practiceDeleteModal.isOpen
        onActivated: {
            if (practiceDeleteModal.isOpen) practiceDeleteModal.isOpen = false
            else if (practiceRoot.isHelpOpen) practiceRoot.isHelpOpen = false
            else if (practiceRoot.isMemoryDrawerOpen) practiceRoot.isMemoryDrawerOpen = false
            else if (practiceRoot.isNewSessionModalOpen) practiceRoot.isNewSessionModalOpen = false
            else if (practiceRoot.isInterviewSetupOpen) practiceRoot.isInterviewSetupOpen = false
            else if (practiceRoot.isFeedbackOpen) practiceRoot.isFeedbackOpen = false
            else if (practiceRoot.isMicTestOpen) practiceRoot.isMicTestOpen = false
        }
    }
}

