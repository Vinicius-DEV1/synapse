import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

// Interactive Code Block mirroring apps/web-react/src/components/editor-extensions/CodeBlockComponent.tsx
Rectangle {
    id: codeBlockRoot
    Layout.fillWidth: true
    implicitHeight: codeContentCol.implicitHeight
    radius: 12
    color: "#0d1117"
    border.color: hoverHandler.hovered || codeEdit.activeFocus ? "#4d8b5cf6" : "#1affffff"
    border.width: 1
    clip: true
    Behavior on border.color { ColorAnimation { duration: 150 } }

    property var blockData: ({})
    property var controller: null
    property var attrs: blockData && blockData.attrs ? blockData.attrs : ({})
    property string language: attrs["language"] || attrs["data-language"] || "plaintext"
    property string code: (attrs && attrs["code"]) !== undefined ? String(attrs["code"]) : String(blockData.innerHtml || "")
    property bool copied: false
    property bool wrapLines: true
    property bool showLangMenu: false
    property bool confirmDelete: false
    property bool isSyncing: false
    property bool readyForUserEdits: false
    property string lastSyncedCode: ""

    readonly property var supportedLanguages: [
        "plaintext", "typescript", "javascript", "python", "rust", "cpp",
        "html", "css", "json", "sql", "bash", "markdown", "yaml", "go"
    ]

    signal codeUpdated(string newCode)
    signal languageChangedByUser(string newLang)
    signal askAiRequested(string selectedText)
    signal deleteRequested()
    signal removeRequested()

    HoverHandler { id: hoverHandler }

    function flushPendingEdits() {
        if (!codeDebounce.running) return true
        codeDebounce.stop()
        if (codeEdit.text !== lastSyncedCode) {
            lastSyncedCode = codeEdit.text
            codeBlockRoot.codeUpdated(codeEdit.text)
        }
        return true
    }

    function hasPendingEdits() {
        return codeDebounce.running || (readyForUserEdits && codeEdit.text !== lastSyncedCode)
    }

    Timer {
        id: copiedTimer
        interval: 1800
        onTriggered: codeBlockRoot.copied = false
    }

    Timer {
        id: codeDebounce
        interval: 220
        onTriggered: {
            if (codeEdit.text !== codeBlockRoot.lastSyncedCode) {
                codeBlockRoot.lastSyncedCode = codeEdit.text
                codeBlockRoot.codeUpdated(codeEdit.text)
            }
        }
    }

    Component.onCompleted: {
        isSyncing = true
        codeEdit.text = codeBlockRoot.code
        lastSyncedCode = codeEdit.text
        isSyncing = false
        Qt.callLater(function() {
            if (codeBlockRoot) {
                codeBlockRoot.lastSyncedCode = codeEdit.text
                codeBlockRoot.readyForUserEdits = true
            }
        })
    }

    Component.onDestruction: {
        copiedTimer.stop()
        codeDebounce.stop()
    }

    onBlockDataChanged: {
        var a = blockData && blockData.attrs ? blockData.attrs : ({})
        var nextLang = a["language"] || a["data-language"] || "plaintext"
        if (!langPopup.opened && language !== nextLang) language = nextLang
        if (codeEdit.activeFocus) return
        var nextCode = a["code"] !== undefined ? String(a["code"]) : String(blockData.innerHtml || "")
        lastSyncedCode = nextCode
        if (codeEdit.text !== nextCode) {
            isSyncing = true
            codeEdit.text = nextCode
            lastSyncedCode = codeEdit.text
            isSyncing = false
        }
    }

    ColumnLayout {
        id: codeContentCol
        width: parent.width
        spacing: 0

        // macOS Terminal Header Bar
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 38
            color: "#e6161b22"

            Rectangle { anchors.bottom: parent.bottom; anchors.left: parent.left; anchors.right: parent.right; height: 1; color: "#0dffffff" }

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 12
                anchors.rightMargin: 10
                spacing: 10

                RowLayout {
                    spacing: 6
                    Rectangle { width: 10; height: 10; radius: 5; color: hoverHandler.hovered ? "#ff5f56" : "#b3ff5f56" }
                    Rectangle { width: 10; height: 10; radius: 5; color: hoverHandler.hovered ? "#ffbd2e" : "#b3ffbd2e" }
                    Rectangle { width: 10; height: 10; radius: 5; color: hoverHandler.hovered ? "#27c93f" : "#b327c93f" }
                }

                Rectangle { Layout.preferredWidth: 1; Layout.preferredHeight: 14; color: "#1affffff" }

                Button {
                    id: langPickerBtn
                    Layout.preferredHeight: 24
                    leftPadding: 8; rightPadding: 8
                    focusPolicy: Qt.NoFocus
                    onClicked: langPopup.open()
                    background: Rectangle { radius: 6; color: parent.hovered ? "#1affffff" : "#0dffffff"; border.color: "#14ffffff" }
                    contentItem: RowLayout {
                        spacing: 6
                        AppIcon { name: "code"; color: "#a78bfa"; width: 12; height: 12 }
                        Text {
                            text: (codeBlockRoot.language || "plaintext").toUpperCase()
                            color: "#e2e8f0"
                            font.pixelSize: 11; font.family: "monospace"; font.weight: Font.Medium
                        }
                        AppIcon { name: "chevron-down"; color: "#94a1b2"; width: 10; height: 10 }
                    }
                    Popup {
                        id: langPopup
                        y: parent.height + 4
                        width: 164
                        padding: 4
                        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
                        background: Rectangle { color: "#161b22"; radius: 8; border.color: "#33ffffff" }
                        contentItem: ColumnLayout {
                            spacing: 1
                            Repeater {
                                model: codeBlockRoot.supportedLanguages
                                delegate: Button {
                                    required property string modelData
                                    Layout.fillWidth: true; Layout.preferredHeight: 24
                                    focusPolicy: Qt.NoFocus
                                    onClicked: {
                                        langPopup.close()
                                        codeBlockRoot.language = modelData
                                        codeBlockRoot.languageChangedByUser(modelData)
                                    }
                                    background: Rectangle {
                                        radius: 5
                                        color: modelData === codeBlockRoot.language ? "#268b5cf6" : (parent.hovered ? "#14ffffff" : "transparent")
                                    }
                                    contentItem: Text {
                                        text: modelData
                                        color: modelData === codeBlockRoot.language ? "#c4b5fd" : "#e2e8f0"
                                        font.pixelSize: 11; font.family: "monospace"
                                        leftPadding: 6
                                        verticalAlignment: Text.AlignVCenter
                                    }
                                }
                            }
                        }
                    }
                }

                Item { Layout.fillWidth: true }

                ToolButton {
                    Layout.preferredHeight: 24; Layout.preferredWidth: 26
                    focusPolicy: Qt.NoFocus
                    ToolTip.visible: hovered; ToolTip.text: qsTr("Quebrar linhas")
                    onClicked: codeBlockRoot.wrapLines = !codeBlockRoot.wrapLines
                    background: Rectangle { radius: 6; color: codeBlockRoot.wrapLines ? "#228b5cf6" : (parent.hovered ? "#1affffff" : "transparent") }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "align-left"; color: codeBlockRoot.wrapLines ? "#c4b5fd" : "#a7a9be"; width: 12; height: 12 }
                }

                ToolButton {
                    objectName: "notesCodeBlockAiButton"
                    Layout.preferredHeight: 24; Layout.preferredWidth: 26
                    focusPolicy: Qt.NoFocus
                    ToolTip.visible: hovered; ToolTip.text: qsTr("Explicar ou melhorar com IA")
                    onClicked: codeBlockRoot.askAiRequested(codeEdit.selectedText || codeEdit.text)
                    background: Rectangle { radius: 6; color: parent.hovered ? "#338b5cf6" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "sparkles"; color: "#a78bfa"; width: 13; height: 13 }
                }

                Button {
                    Layout.preferredHeight: 24
                    leftPadding: 8; rightPadding: 8
                    focusPolicy: Qt.NoFocus
                    onClicked: {
                        var s = codeEdit.selectionStart; var e = codeEdit.selectionEnd
                        codeEdit.selectAll(); codeEdit.copy(); codeEdit.select(s, e)
                        codeBlockRoot.copied = true
                        copiedTimer.restart()
                    }
                    background: Rectangle { radius: 6; color: codeBlockRoot.copied ? "#2610b981" : (parent.hovered ? "#1affffff" : "transparent") }
                    contentItem: RowLayout {
                        spacing: 4
                        AppIcon { name: codeBlockRoot.copied ? "check" : "copy"; color: codeBlockRoot.copied ? "#34d399" : "#a7a9be"; width: 12; height: 12 }
                        Text { text: codeBlockRoot.copied ? qsTr("Copiado") : qsTr("Copiar"); color: codeBlockRoot.copied ? "#34d399" : "#a7a9be"; font.pixelSize: 11 }
                    }
                }

                ToolButton {
                    visible: !codeBlockRoot.confirmDelete
                    Layout.preferredWidth: 24; Layout.preferredHeight: 24
                    focusPolicy: Qt.NoFocus
                    ToolTip.visible: hovered; ToolTip.text: qsTr("Remover bloco de código")
                    onClicked: codeBlockRoot.confirmDelete = true
                    background: Rectangle { radius: 6; color: parent.hovered ? "#22ef4444" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: parent.hovered ? "#fb7185" : "#94a1b2"; width: 12; height: 12 }
                }

                Button {
                    visible: codeBlockRoot.confirmDelete
                    Layout.preferredHeight: 24
                    leftPadding: 8; rightPadding: 8
                    focusPolicy: Qt.NoFocus
                    onClicked: { codeBlockRoot.deleteRequested(); codeBlockRoot.removeRequested() }
                    background: Rectangle { radius: 6; color: "#dc2626" }
                    contentItem: Text { text: qsTr("Confirmar"); color: "#ffffff"; font.pixelSize: 10; font.bold: true }
                }
            }
        }

        // Editable monospace code canvas
        Flickable {
            Layout.fillWidth: true
            Layout.preferredHeight: Math.max(74, Math.min(440, codeEdit.contentHeight + 24))
            contentWidth: codeBlockRoot.wrapLines ? width : Math.max(width, codeEdit.contentWidth + 24)
            contentHeight: codeEdit.contentHeight + 24
            clip: true

            TextArea {
                id: codeEdit
                width: codeBlockRoot.wrapLines ? parent.width : Math.max(parent.width, contentWidth)
                color: "#e6edf3"
                selectionColor: "#408b5cf6"
                selectedTextColor: "#ffffff"
                font.family: "monospace"
                font.pixelSize: 13
                wrapMode: codeBlockRoot.wrapLines ? TextEdit.Wrap : TextEdit.NoWrap
                topPadding: 12; bottomPadding: 12; leftPadding: 14; rightPadding: 14
                background: null
                placeholderText: qsTr("// Escreva ou cole seu código aqui...")
                placeholderTextColor: "#475569"
                onTextChanged: {
                    if (codeBlockRoot.isSyncing || !codeBlockRoot.readyForUserEdits) return
                    if (text === codeBlockRoot.lastSyncedCode) {
                        codeDebounce.stop()
                        return
                    }
                    codeBlockRoot.confirmDelete = false
                    codeDebounce.restart()
                }
                onActiveFocusChanged: {
                    if (!activeFocus && codeBlockRoot.readyForUserEdits) codeBlockRoot.flushPendingEdits()
                }
            }
        }
    }
}
