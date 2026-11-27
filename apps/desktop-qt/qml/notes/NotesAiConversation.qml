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
            return BlockAiProposal.details(JSON.parse(sourceBlockState), String(message.content || ""), controller)
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
                        readonly property bool showingProposalDiff: conversationRoot.diffMessageIndex === index && proposalDiff.length > 0
                        width: messageColumn.width
                        height: messageBubble.implicitHeight + (messageActions.visible ? messageActions.implicitHeight + 4 : 0)

                        Rectangle {
                            id: messageBubble
                            x: messageRow.userMessage ? messageRow.width - width : 0
                            width: Math.min(messageRow.width * 0.88, messageText.implicitWidth + 24)
                            height: 16 + (messageRow.showingProposalDiff
                                ? 24 + Math.min(diffMessageText.implicitHeight, 220)
                                : messageText.implicitHeight)
                            implicitHeight: height
                            radius: 10
                            color: messageRow.userMessage ? "#6d28d9" : "#1a1b22"
                            border.color: messageRow.userMessage ? "transparent" : "#24ffffff"

                            Column {
                                id: messageContent
                                x: 12
                                y: 8
                                width: parent.width - 24
                                spacing: 6

                                Row {
                                    objectName: "notesAiDiffHeader"
                                    visible: messageRow.showingProposalDiff
                                    width: parent.width
                                    height: messageRow.showingProposalDiff ? 18 : 0
                                    spacing: 5

                                    Text {
                                        id: diffHeaderLabel
                                        text: qsTr("Comparação de Modificações")
                                        color: "#c4b5fd"
                                        font.pixelSize: 11
                                        font.weight: Font.Medium
                                        verticalAlignment: Text.AlignVCenter
                                    }
                                    Item {
                                        width: Math.max(0, parent.width - diffHeaderLabel.implicitWidth -
                                            (diffCountBadge.visible ? diffCountBadge.width + 5 : 0) - 5)
                                        height: 1
                                    }
                                    Rectangle {
                                        id: diffCountBadge
                                        objectName: "notesAiDiffCount"
                                        visible: messageRow.proposal && messageRow.proposal.isSearchReplace
                                        width: messageRow.proposal && messageRow.proposal.isSearchReplace
                                            ? diffCountText.implicitWidth + 12 : 0
                                        height: 17
                                        radius: 4
                                        color: "#1a10b981"
                                        border.color: "#3334d399"
                                        Text {
                                            id: diffCountText
                                            objectName: "notesAiDiffCountText"
                                            anchors.centerIn: parent
                                            text: qsTr("%1 cirúrgica(s)").arg(messageRow.proposal ? messageRow.proposal.searchReplaceCount : 0)
                                            color: "#34d399"
                                            font.pixelSize: 10
                                        }
                                    }
                                }

                                TextEdit {
                                    id: messageText
                                    objectName: "notesAiMessageText"
                                    visible: !messageRow.showingProposalDiff
                                    width: parent.width
                                    readOnly: true
                                    text: messageRow.userMessage
                                        ? conversationRoot.displayMessage(messageRow.modelData, messageRow.index)
                                        : BlockAiOperations.richContentHtml(String(messageRow.modelData.content || ""))
                                    textFormat: messageRow.userMessage ? Text.PlainText : Text.RichText
                                    color: messageRow.userMessage ? "#ffffff" : "#e4e4e7"
                                    font.pixelSize: 12
                                    wrapMode: TextEdit.WordWrap
                                    selectByMouse: true
                                }

                                Rectangle {
                                    id: diffViewerFrame
                                    visible: messageRow.showingProposalDiff
                                    width: parent.width
                                    height: messageRow.showingProposalDiff
                                        ? Math.min(diffMessageText.implicitHeight + 20, 220) : 0
                                    implicitHeight: height
                                    radius: 8
                                    color: "#66000000"
                                    border.color: "#24ffffff"

                                    Flickable {
                                        objectName: "notesAiDiffViewer"
                                        anchors.fill: parent
                                        contentWidth: width
                                        contentHeight: diffMessageText.implicitHeight + 20
                                        clip: true
                                        boundsBehavior: Flickable.StopAtBounds

                                        TextEdit {
                                            id: diffMessageText
                                            objectName: "notesAiDiffMessageText"
                                            x: 10
                                            y: 10
                                            width: parent.width - 20
                                            text: messageRow.proposalDiff
                                            textFormat: Text.RichText
                                            readOnly: true
                                            color: "#e4e4e7"
                                            font.family: "monospace"
                                            font.pixelSize: 11
                                            wrapMode: TextEdit.WordWrap
                                            selectByMouse: true
                                        }
                                    }
                                }
                            }
                        }

                        NotesAiMessageActions {
                            id: messageActions
                            objectName: "notesAiMessageActions"
                            x: 0
                            y: messageBubble.height + 4
                            width: messageRow.width
                            visible: !messageRow.userMessage && conversationRoot.blockScoped
                            message: messageRow.modelData
                            messageIndex: messageRow.index
                            proposal: messageRow.proposal
                            proposalDiff: messageRow.proposalDiff
                            blockType: conversationRoot.blockType
                            isGenerating: conversationRoot.isGenerating
                            diffMessageIndex: conversationRoot.diffMessageIndex
                            copiedMessageIndex: conversationRoot.copiedMessageIndex
                            onApplyRequested: function(message, isValid) { conversationRoot.applyRequested(message, isValid) }
                            onDiffToggled: function(index) { conversationRoot.diffToggled(index) }
                            onInsertRequested: function(message, cleanText, isSearchReplace) {
                                conversationRoot.insertRequested(message, cleanText, isSearchReplace)
                            }
                            onCopyRequested: function(message, index, cleanText) {
                                conversationRoot.copyRequested(message, index, cleanText)
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
