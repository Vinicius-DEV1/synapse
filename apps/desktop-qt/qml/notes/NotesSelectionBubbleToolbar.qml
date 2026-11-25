import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Item {
    id: overlayRoot
    anchors.fill: parent

    property var richEditor: null
    property var editorRoot: null
    property var richCommands: null
    property var pageReferenceFlow: null
    property bool slashMenuOpen: false
    property bool pageReferenceMenuOpen: false
    property string detectedPasteUrl: ""

    signal askAiRequested(string selectedText)
    signal externalLinkRequested(string link)
    signal convertUrlToCardRequested(string url)
    signal dismissPasteUrlRequested()

    Rectangle {
        id: selectionBubble
        objectName: "notesSelectionBubbleToolbar"
        visible: overlayRoot.richEditor &&
                 overlayRoot.richEditor.activeFocus &&
                 overlayRoot.richEditor.selectionStart !== overlayRoot.richEditor.selectionEnd &&
                 !overlayRoot.slashMenuOpen &&
                 !overlayRoot.pageReferenceMenuOpen &&
                 overlayRoot.editorRoot &&
                 overlayRoot.editorRoot.active &&
                 !overlayRoot.editorRoot.hasInvalidContent
        x: overlayRoot.richEditor
            ? Math.max(8, Math.min(overlayRoot.width - width - 8, overlayRoot.richEditor.cursorRectangle.x - width / 2))
            : 8
        y: overlayRoot.richEditor
            ? Math.max(0, overlayRoot.richEditor.cursorRectangle.y - height - 10)
            : 0
        width: bubbleRow.implicitWidth + 16
        height: 36
        radius: 11
        color: "#f00f0e17"
        border.color: "#1affffff"
        border.width: 1
        z: 99

        RowLayout {
            id: bubbleRow
            anchors.centerIn: parent
            spacing: 2

            Repeater {
                model: [
                    { mark: "bold", label: "B", tip: qsTr("Negrito (Ctrl+B)"), bold: true, italic: false, under: false, strike: false },
                    { mark: "italic", label: "I", tip: qsTr("Itálico (Ctrl+I)"), bold: false, italic: true, under: false, strike: false },
                    { mark: "underline", label: "U", tip: qsTr("Sublinhado (Ctrl+U)"), bold: false, italic: false, under: true, strike: false },
                    { mark: "strike", label: "S", tip: qsTr("Tachado"), bold: false, italic: false, under: false, strike: true }
                ]
                delegate: ToolButton {
                    id: markBtn
                    required property var modelData
                    focusPolicy: Qt.NoFocus
                    Layout.preferredWidth: 26
                    Layout.preferredHeight: 24
                    padding: 1
                    readonly property bool isActive: {
                        if (!overlayRoot.richCommands) return false
                        if (modelData.mark === "bold") return overlayRoot.richCommands.boldAtCursor
                        if (modelData.mark === "italic") return overlayRoot.richCommands.italicAtCursor
                        if (modelData.mark === "underline") return overlayRoot.richCommands.underlineAtCursor
                        if (modelData.mark === "strike") return overlayRoot.richCommands.strikeAtCursor
                        return false
                    }
                    ToolTip.visible: hovered
                    ToolTip.text: modelData.tip
                    background: Rectangle {
                        radius: 5
                        color: markBtn.isActive ? "#268b5cf6" : (markBtn.hovered ? "#1affffff" : "transparent")
                        border.color: markBtn.isActive ? "#408b5cf6" : "transparent"
                    }
                    contentItem: Text {
                        anchors.centerIn: parent
                        text: markBtn.modelData.label
                        color: markBtn.isActive ? "#c4b5fd" : (markBtn.hovered ? "#fffffe" : "#a7a9be")
                        font.pixelSize: 12
                        font.bold: markBtn.modelData.bold
                        font.italic: markBtn.modelData.italic
                        font.underline: markBtn.modelData.under
                        font.strikeout: markBtn.modelData.strike
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: if (overlayRoot.richCommands) overlayRoot.richCommands.toggleMark(modelData.mark)
                }
            }

            ToolButton {
                id: bubbleCode
                focusPolicy: Qt.NoFocus
                Layout.preferredWidth: 26
                Layout.preferredHeight: 24
                readonly property bool isActive: overlayRoot.richCommands ? overlayRoot.richCommands.codeAtCursor : false
                ToolTip.visible: hovered
                ToolTip.text: qsTr("Código inline")
                background: Rectangle {
                    radius: 5
                    color: bubbleCode.isActive ? "#268b5cf6" : (bubbleCode.hovered ? "#1affffff" : "transparent")
                    border.color: bubbleCode.isActive ? "#408b5cf6" : "transparent"
                }
                contentItem: AppIcon {
                    anchors.centerIn: parent
                    name: "code"
                    color: bubbleCode.isActive ? "#c4b5fd" : (bubbleCode.hovered ? "#fffffe" : "#a7a9be")
                    width: 13
                    height: 13
                }
                onClicked: if (overlayRoot.richCommands) overlayRoot.richCommands.toggleMark("code")
            }

            ToolButton {
                id: bubbleSpoiler
                focusPolicy: Qt.NoFocus
                Layout.preferredWidth: 26
                Layout.preferredHeight: 24
                readonly property bool isActive: overlayRoot.richCommands ? overlayRoot.richCommands.spoilerAtCursor : false
                ToolTip.visible: hovered
                ToolTip.text: qsTr("Spoiler (Alt+R para revelar)")
                background: Rectangle {
                    radius: 5
                    color: bubbleSpoiler.isActive ? "#268b5cf6" : (bubbleSpoiler.hovered ? "#1affffff" : "transparent")
                    border.color: bubbleSpoiler.isActive ? "#408b5cf6" : "transparent"
                }
                contentItem: AppIcon {
                    anchors.centerIn: parent
                    name: "eye"
                    color: bubbleSpoiler.isActive ? "#c4b5fd" : (bubbleSpoiler.hovered ? "#fffffe" : "#a7a9be")
                    width: 13
                    height: 13
                }
                onClicked: if (overlayRoot.richCommands) overlayRoot.richCommands.toggleMark("spoiler")
            }

            Rectangle { Layout.preferredWidth: 1; Layout.preferredHeight: 14; color: "#18ffffff" }

            ToolButton {
                id: bubbleLink
                focusPolicy: Qt.NoFocus
                Layout.preferredWidth: 26
                Layout.preferredHeight: 24
                ToolTip.visible: hovered
                ToolTip.text: qsTr("Inserir link")
                background: Rectangle { radius: 5; color: bubbleLink.hovered ? "#1affffff" : "transparent" }
                contentItem: AppIcon {
                    anchors.centerIn: parent
                    name: "link"
                    color: bubbleLink.hovered ? "#ffffff" : "#c4b5fd"
                    width: 13
                    height: 13
                }
                onClicked: if (overlayRoot.richCommands) overlayRoot.richCommands.openLinkDialog()
            }

            NotesRichColorPalette {
                Layout.preferredWidth: 26
                Layout.preferredHeight: 24
                richMode: true
                onColorSelected: function(background, color) {
                    if (overlayRoot.editorRoot && overlayRoot.editorRoot.tableActions) {
                        overlayRoot.editorRoot.tableActions.setColor(background, color)
                    }
                }
            }

            ToolButton {
                id: bubblePageRef
                focusPolicy: Qt.NoFocus
                Layout.preferredWidth: 26
                Layout.preferredHeight: 24
                ToolTip.visible: hovered
                ToolTip.text: qsTr("Vincular página ([[)")
                background: Rectangle { radius: 5; color: bubblePageRef.hovered ? "#1affffff" : "transparent" }
                contentItem: AppIcon {
                    anchors.centerIn: parent
                    name: "file-symlink"
                    color: bubblePageRef.hovered ? "#ffffff" : "#94a1b2"
                    width: 13
                    height: 13
                }
                onClicked: {
                    if (overlayRoot.pageReferenceFlow && overlayRoot.richEditor) {
                        overlayRoot.pageReferenceFlow.openForPosition(
                            overlayRoot.richEditor.selectionEnd, "", false,
                            overlayRoot.richEditor.cursorRectangle.x, overlayRoot.richEditor.cursorRectangle.y + 20)
                    }
                }
            }

            Rectangle { Layout.preferredWidth: 1; Layout.preferredHeight: 14; color: "#18ffffff" }

            ToolButton {
                id: bubbleAskAi
                focusPolicy: Qt.NoFocus
                Layout.preferredWidth: 28
                Layout.preferredHeight: 24
                ToolTip.visible: hovered
                ToolTip.text: qsTr("Editar ou perguntar à IA")
                background: Rectangle { radius: 6; color: bubbleAskAi.hovered ? "#268b5cf6" : "transparent" }
                contentItem: AppIcon {
                    anchors.centerIn: parent
                    name: "sparkles"
                    color: "#a78bfa"
                    width: 14
                    height: 14
                }
                onClicked: if (overlayRoot.richEditor) overlayRoot.askAiRequested(overlayRoot.richEditor.selectedText)
            }
        }
    }

    Rectangle {
        visible: overlayRoot.detectedPasteUrl.length > 0 && !overlayRoot.slashMenuOpen &&
                 overlayRoot.editorRoot && overlayRoot.editorRoot.active
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        anchors.margins: 10
        width: pasteUrlRow.implicitWidth + 20
        height: 32
        radius: 9
        color: "#1e1b2e"
        border.color: "#4d8b5cf6"
        z: 35

        RowLayout {
            id: pasteUrlRow
            anchors.centerIn: parent
            spacing: 8

            AppIcon { name: "globe"; color: "#c4b5fd"; width: 13; height: 13 }

            Text {
                text: qsTr("Link colado")
                color: "#e2e8f0"
                font.pixelSize: 11
                font.weight: Font.DemiBold
            }

            Button {
                text: qsTr("Criar Card")
                Layout.preferredHeight: 22
                leftPadding: 8
                rightPadding: 8
                focusPolicy: Qt.NoFocus
                background: Rectangle { radius: 5; color: parent.hovered ? "#7c3aed" : "#6d28d9" }
                contentItem: Text {
                    text: parent.text
                    color: "#fffffe"
                    font.pixelSize: 10
                    font.weight: Font.DemiBold
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
                onClicked: overlayRoot.convertUrlToCardRequested(overlayRoot.detectedPasteUrl)
            }

            Button {
                text: qsTr("Abrir")
                Layout.preferredHeight: 22
                leftPadding: 8
                rightPadding: 8
                focusPolicy: Qt.NoFocus
                background: Rectangle { radius: 5; color: parent.hovered ? "#26ffffff" : "#14ffffff" }
                contentItem: Text {
                    text: parent.text
                    color: "#e2e8f0"
                    font.pixelSize: 10
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
                onClicked: {
                    overlayRoot.externalLinkRequested(overlayRoot.detectedPasteUrl)
                    overlayRoot.dismissPasteUrlRequested()
                }
            }

            ToolButton {
                Layout.preferredWidth: 20
                Layout.preferredHeight: 20
                focusPolicy: Qt.NoFocus
                onClicked: overlayRoot.dismissPasteUrlRequested()
                background: Rectangle { color: "transparent" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: "#94a1b2"; width: 10; height: 10 }
            }
        }
    }
}
