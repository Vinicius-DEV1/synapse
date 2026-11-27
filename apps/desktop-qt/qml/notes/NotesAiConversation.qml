pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15
import "NotesBlockAiOperations.js" as BlockAiOperations
import "NotesBlockAiProposal.js" as BlockAiProposal

Item {
    id: conversationRoot
    objectName: "notesAiConversation"

    property var messages: []
    property bool blockScoped: false
    property bool isGenerating: false
    property string blockType: ""
    property string sourceBlockState: ""
    property var controller: null
    property int diffMessageIndex: -1
    property int copiedMessageIndex: -1

    signal applyRequested(var message, bool isValid)
    signal diffToggled(int messageIndex)
    signal insertRequested(var message, string cleanText, bool isSearchReplace)
    signal copyRequested(var message, int messageIndex, string cleanText)

    function scrollToEnd() {
        Qt.callLater(function() {
            messageScroll.contentY = Math.max(0, messageScroll.contentHeight - messageScroll.height)
        })
    }

    function displayMessage(message, index) {
        var content = String(message && message.content || "")
        if (index === 0 && content.indexOf("Contexto:\n") === 0) {
            var instructionStart = content.indexOf("Instrução:\n")
            if (instructionStart >= 0) return content.substring(instructionStart + "Instrução:\n".length)
        }
        return content
    }

    function proposalForMessage(message) {
        if (!blockScoped || !sourceBlockState || !message || message.role !== "assistant") return null
        try {
            return BlockAiProposal.details(JSON.parse(sourceBlockState), String(message.content || ""))
        } catch (error) {
            console.error("[Notes:BlockAI] Could not analyze a message proposal:", error)
            return null
        }
    }

    function diffForMessage(message) {
        var proposal = proposalForMessage(message)
        if (!proposal || !proposal.diffAvailable || !controller ||
                typeof controller.computeNoteWordDiffHtml !== "function") return ""
        try {
            return String(controller.computeNoteWordDiffHtml(proposal.sourceText, proposal.replacementText) || "")
        } catch (error) {
            console.error("[Notes:BlockAI] Could not calculate a message diff:", error)
            return ""
        }
    }

    onMessagesChanged: scrollToEnd()

    Rectangle {
        anchors.fill: parent
        radius: 8
        color: "#0f0e17"
        border.color: "#24ffffff"

        Flickable {
            id: messageScroll
            objectName: "notesAiMessageScroll"
            anchors.fill: parent
            anchors.margins: 10
            clip: true
            contentWidth: width
            contentHeight: messageColumn.implicitHeight
            boundsBehavior: Flickable.StopAtBounds

            ScrollBar.vertical: ScrollBar { policy: ScrollBar.AsNeeded }

            Column {
                id: messageColumn
                width: parent.width
                height: implicitHeight
                spacing: 12
                onHeightChanged: conversationRoot.scrollToEnd()

                Repeater {
                    id: aiMessagesRepeater
                    objectName: "notesAiMessagesRepeater"
                    model: conversationRoot.messages
                    delegate: Item {
                        id: messageRow
                        objectName: "notesAiMessageRow"
                        required property var modelData
                        required property int index
                        readonly property bool userMessage: String(modelData.role || "") === "user"
                        readonly property var proposal: userMessage ? null : conversationRoot.proposalForMessage(modelData)
                        readonly property string proposalDiff: userMessage ? "" : conversationRoot.diffForMessage(modelData)
                        width: messageColumn.width
                        height: messageBubble.implicitHeight + (messageActions.visible ? messageActions.implicitHeight + 4 : 0)

                        Rectangle {
                            id: messageBubble
                            x: messageRow.userMessage ? messageRow.width - width : 0
                            width: Math.min(messageRow.width * 0.88, messageText.implicitWidth + 24)
                            height: messageText.implicitHeight + 16
                            implicitHeight: height
                            radius: 10
                            color: messageRow.userMessage ? "#6d28d9" : "#1a1b22"
                            border.color: messageRow.userMessage ? "transparent" : "#24ffffff"

                            Text {
                                id: messageText
                                objectName: "notesAiMessageText"
                                anchors.fill: parent
                                anchors.margins: 8
                                text: messageRow.userMessage
                                    ? conversationRoot.displayMessage(messageRow.modelData, messageRow.index)
                                    : conversationRoot.diffMessageIndex === messageRow.index && messageRow.proposalDiff.length > 0
                                        ? messageRow.proposalDiff
                                        : BlockAiOperations.richContentHtml(String(messageRow.modelData.content || ""))
                                textFormat: messageRow.userMessage ? Text.PlainText : Text.RichText
                                color: messageRow.userMessage ? "#ffffff" : "#e4e4e7"
                                font.pixelSize: 12
                                wrapMode: Text.WordWrap
                            }
                        }

                        Flow {
                            id: messageActions
                            objectName: "notesAiMessageActions"
                            x: 0
                            y: messageBubble.height + 4
                            width: messageRow.width
                            visible: !messageRow.userMessage && conversationRoot.blockScoped
                            spacing: 4

                            Button {
                                objectName: "notesAiApplyMessage"
                                visible: Boolean(messageRow.proposal)
                                enabled: !conversationRoot.isGenerating
                                padding: 6
                                onClicked: conversationRoot.applyRequested(messageRow.modelData, Boolean(messageRow.proposal.valid))
                                background: Rectangle {
                                    radius: 5
                                    color: messageRow.proposal && messageRow.proposal.isSearchReplace ? "#3334d399" : "#337c3aed"
                                    border.color: messageRow.proposal && messageRow.proposal.isSearchReplace ? "#554ade80" : "#557c3aed"
                                }
                                contentItem: Text {
                                    text: messageRow.proposal && messageRow.proposal.isSearchReplace
                                        ? qsTr("Aplicar cirurgicamente (%1)").arg(messageRow.proposal.searchReplaceCount)
                                        : conversationRoot.blockType === "codeBlock"
                                            ? qsTr("Substituir Código") : qsTr("Substituir no Bloco")
                                    color: messageRow.proposal && messageRow.proposal.isSearchReplace ? "#6ee7b7" : "#c4b5fd"
                                    font.pixelSize: 10
                                    font.weight: Font.Medium
                                }
                            }
                            Button {
                                objectName: "notesAiDiffMessage"
                                visible: messageRow.proposal && messageRow.proposal.diffAvailable && messageRow.proposalDiff.length > 0
                                padding: 6
                                onClicked: conversationRoot.diffToggled(conversationRoot.diffMessageIndex === messageRow.index ? -1 : messageRow.index)
                                background: Rectangle {
                                    radius: 5
                                    color: conversationRoot.diffMessageIndex === messageRow.index ? "#33f59e0b" : "#1affffff"
                                    border.color: "#24ffffff"
                                }
                                contentItem: Text {
                                    text: conversationRoot.diffMessageIndex === messageRow.index ? qsTr("Ver resposta") : qsTr("Ver Diff")
                                    color: conversationRoot.diffMessageIndex === messageRow.index ? "#fcd34d" : "#a7a9be"
                                    font.pixelSize: 10
                                }
                            }
                            Button {
                                objectName: "notesAiInsertMessage"
                                visible: messageRow.proposal && !messageRow.proposal.isSearchReplace
                                enabled: !conversationRoot.isGenerating
                                padding: 6
                                onClicked: conversationRoot.insertRequested(
                                    messageRow.modelData, messageRow.proposal.cleanText, messageRow.proposal.isSearchReplace)
                                background: Rectangle { radius: 5; color: "#1affffff"; border.color: "#24ffffff" }
                                contentItem: Text { text: qsTr("Inserir"); color: "#cbd5e1"; font.pixelSize: 10 }
                            }
                            Button {
                                objectName: "notesAiCopyMessage"
                                visible: Boolean(messageRow.proposal)
                                padding: 6
                                onClicked: conversationRoot.copyRequested(
                                    messageRow.modelData, messageRow.index,
                                    messageRow.proposal.cleanText || String(messageRow.modelData.content || ""))
                                background: Rectangle { radius: 5; color: "transparent" }
                                contentItem: Text {
                                    text: conversationRoot.copiedMessageIndex === messageRow.index ? qsTr("Copiado") : qsTr("Copiar")
                                    color: conversationRoot.copiedMessageIndex === messageRow.index ? "#34d399" : "#a1a1aa"
                                    font.pixelSize: 10
                                }
                            }
                        }
                    }
                }
                Text {
                    visible: conversationRoot.isGenerating
                    text: qsTr("IA pensando…")
                    color: "#a1a1aa"
                    font.pixelSize: 11
                }
            }
        }
    }
}
