import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: toggleRoot
    Layout.fillWidth: true
    implicitHeight: mainCol.implicitHeight + (isCalloutMode ? 16 : 6)
    radius: isCalloutMode ? 10 : 6
    color: isCalloutMode ? (accentColor + "18") : (headerHover.hovered ? "#141420" : "transparent")
    border.color: isCalloutMode ? (accentColor + "45") : "transparent"
    border.width: isCalloutMode ? 1 : 0

    property var blockData: ({})
    property var attrs: blockData.attrs || ({})
    property bool isCalloutMode: blockData.blockType === "blockquoteToggle"
    property string accentColor: attrs["data-color"] || "#8b5cf6"
    property string title: attrs["data-title"] || attrs["title"] || qsTr("Seção recolhível")
    property string bodyHtml: blockData.innerHtml || ""
    property bool isOpen: (attrs["data-open"] || "true") !== "false"

    signal blockChanged(var updatedBlock)
    signal convertToSubPageRequested(string title, string html)
    signal askAiRequested(string text)
    signal duplicateRequested()
    signal removeRequested()

    HoverHandler { id: headerHover }

    Rectangle {
        visible: toggleRoot.isCalloutMode
        anchors.left: parent.left
        anchors.top: parent.top
        anchors.bottom: parent.bottom
        width: 4
        radius: 2
        color: toggleRoot.accentColor
    }

    function emitUpdate() {
        var nextAttrs = Object.assign({}, attrs)
        nextAttrs["data-type"] = isCalloutMode ? "blockquote-toggle" : "toggle-block"
        nextAttrs["data-title"] = titleInput.text
        nextAttrs["data-open"] = isOpen ? "true" : "false"
        if (isCalloutMode) nextAttrs["data-color"] = accentColor
        blockChanged({
            id: blockData.id || "",
            blockType: blockData.blockType || (isCalloutMode ? "blockquoteToggle" : "toggleBlock"),
            attrs: nextAttrs,
            innerHtml: bodyArea.text,
            html: ""
        })
    }

    function plainSummary(html) {
        return String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    }

    ColumnLayout {
        id: mainCol
        anchors.fill: parent
        anchors.leftMargin: toggleRoot.isCalloutMode ? 14 : 6
        anchors.rightMargin: 8
        anchors.topMargin: toggleRoot.isCalloutMode ? 8 : 2
        anchors.bottomMargin: toggleRoot.isCalloutMode ? 8 : 2
        spacing: 4

        RowLayout {
            Layout.fillWidth: true
            spacing: 6

            ToolButton {
                Layout.preferredWidth: 24
                Layout.preferredHeight: 24
                focusPolicy: Qt.NoFocus
                onClicked: {
                    toggleRoot.isOpen = !toggleRoot.isOpen
                    toggleRoot.emitUpdate()
                }
                background: Rectangle { radius: 5; color: parent.hovered ? "#1affffff" : "transparent" }
                contentItem: AppIcon {
                    anchors.centerIn: parent
                    name: toggleRoot.isOpen ? "chevron-down" : "chevron-right"
                    color: toggleRoot.isOpen ? "#c4b5fd" : "#94a1b2"
                    width: 13
                    height: 13
                }
            }

            TextField {
                id: titleInput
                Layout.fillWidth: true
                text: toggleRoot.title
                color: "#fffffe"
                font.pixelSize: 14
                font.weight: Font.DemiBold
                placeholderText: qsTr("Título do toggle...")
                placeholderTextColor: "#52525b"
                background: null
                onEditingFinished: {
                    toggleRoot.title = text
                    toggleRoot.emitUpdate()
                }
            }

            RowLayout {
                visible: headerHover.hovered || titleInput.activeFocus || bodyArea.activeFocus
                spacing: 2

                Repeater {
                    model: toggleRoot.isCalloutMode ? ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"] : []
                    delegate: Rectangle {
                        required property string modelData
                        Layout.preferredWidth: 12
                        Layout.preferredHeight: 12
                        radius: 6
                        color: modelData
                        border.color: toggleRoot.accentColor === modelData ? "#ffffff" : "transparent"
                        border.width: 1.5
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                toggleRoot.accentColor = modelData
                                toggleRoot.emitUpdate()
                            }
                        }
                    }
                }

                ToolButton {
                    Layout.preferredWidth: 24
                    Layout.preferredHeight: 24
                    focusPolicy: Qt.NoFocus
                    ToolTip.visible: hovered
                    ToolTip.text: qsTr("Pedir à IA")
                    onClicked: toggleRoot.askAiRequested(titleInput.text + "\n" + toggleRoot.plainSummary(bodyArea.text))
                    background: Rectangle { radius: 5; color: parent.hovered ? "#228b5cf6" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "sparkles"; color: "#c4b5fd"; width: 12; height: 12 }
                }

                ToolButton {
                    Layout.preferredWidth: 24
                    Layout.preferredHeight: 24
                    focusPolicy: Qt.NoFocus
                    ToolTip.visible: hovered
                    ToolTip.text: toggleRoot.isCalloutMode ? qsTr("Converter em Toggle simples") : qsTr("Converter em Callout")
                    onClicked: {
                        toggleRoot.isCalloutMode = !toggleRoot.isCalloutMode
                        toggleRoot.blockData.blockType = toggleRoot.isCalloutMode ? "blockquoteToggle" : "toggleBlock"
                        toggleRoot.emitUpdate()
                    }
                    background: Rectangle { radius: 5; color: parent.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "palette"; color: "#a7a9be"; width: 12; height: 12 }
                }

                ToolButton {
                    Layout.preferredWidth: 24
                    Layout.preferredHeight: 24
                    focusPolicy: Qt.NoFocus
                    ToolTip.visible: hovered
                    ToolTip.text: qsTr("Converter em sub-página")
                    onClicked: toggleRoot.convertToSubPageRequested(titleInput.text || "Sub-página", bodyArea.text)
                    background: Rectangle { radius: 5; color: parent.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "file-symlink"; color: "#a7a9be"; width: 12; height: 12 }
                }

                ToolButton {
                    Layout.preferredWidth: 24
                    Layout.preferredHeight: 24
                    focusPolicy: Qt.NoFocus
                    ToolTip.visible: hovered
                    ToolTip.text: qsTr("Remover toggle")
                    onClicked: toggleRoot.removeRequested()
                    background: Rectangle { radius: 5; color: parent.hovered ? "#22ef4444" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: "#fda4af"; width: 12; height: 12 }
                }
            }
        }

        Rectangle {
            visible: toggleRoot.isOpen
            Layout.fillWidth: true
            Layout.leftMargin: 28
            implicitHeight: Math.max(44, bodyArea.contentHeight + 12)
            radius: 6
            color: "#0b0b12"
            border.color: bodyArea.activeFocus ? "#448b5cf6" : "#0effffff"

            TextArea {
                id: bodyArea
                anchors.fill: parent
                anchors.margins: 6
                text: toggleRoot.plainSummary(toggleRoot.bodyHtml)
                placeholderText: qsTr("Escreva dentro da seção recolhível...")
                placeholderTextColor: "#52525b"
                color: "#e2e8f0"
                font.pixelSize: 13
                wrapMode: TextEdit.Wrap
                background: null
                onEditingFinished: {
                    toggleRoot.bodyHtml = "<p>" + text + "</p>"
                    toggleRoot.emitUpdate()
                }
            }
        }
    }
}
