import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"
import "../modals"

Rectangle {
    id: scrapWidgetRoot
    implicitWidth: Math.min(parent ? parent.width : 500, viewerOpen ? (parent ? parent.width : 500) : (headerRow.implicitWidth + 24))
    implicitHeight: mainCol.implicitHeight + 12
    radius: 12

    property var blockData: ({})
    property var controller: null
    property var attrs: blockData.attrs || ({})
    property string scrapUrl: attrs["data-url"] || attrs["url"] || ""
    property string title: attrs["data-title"] || attrs["title"] || ""
    property string status: attrs["data-status"] || attrs["status"] || "ready"
    property string driveFileId: attrs["data-drive-file-id"] || attrs["drive_file_id"] || ""
    property int fileSize: parseInt(attrs["data-file-size"] || attrs["file_size"] || "0", 10) || 0
    property string excerpt: attrs["data-content"] || attrs["data-excerpt"] || blockData.innerHtml || ""
    property bool viewerOpen: false

    readonly property bool isError: status === "error"
    readonly property bool isCapturing: status === "capturing"
    readonly property string cleanDomain: {
        var m = String(scrapUrl || "").match(/^https?:\/\/([^/?#:]+)/i)
        return m ? m[1].replace(/^www\./i, "") : scrapUrl
    }

    color: isError
        ? "#1af43f5e"
        : (isCapturing
            ? "#1af59e0b"
            : (hoverHandler.hovered ? "#1a1924" : "#e61a1924"))
    border.color: isError
        ? "#66f43f5e"
        : (isCapturing
            ? "#66f59e0b"
            : (hoverHandler.hovered ? "#668b5cf6" : "#1affffff"))
    border.width: 1
    Behavior on color { ColorAnimation { duration: 150 } }
    Behavior on border.color { ColorAnimation { duration: 150 } }

    signal removeRequested()

    HoverHandler { id: hoverHandler }

    function formatBytes(bytes) {
        if (!bytes || bytes <= 0) return ""
        if (bytes < 1024) return bytes + " B"
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
        return (bytes / 1048576).toFixed(1) + " MB"
    }

    ColumnLayout {
        id: mainCol
        anchors.fill: parent
        anchors.leftMargin: 12
        anchors.rightMargin: 10
        anchors.topMargin: 6
        anchors.bottomMargin: 6
        spacing: 8

        RowLayout {
            id: headerRow
            Layout.fillWidth: true
            spacing: 8

            // Favicon / Globe box: w-5 h-5 rounded-md bg-black/20
            Rectangle {
                Layout.preferredWidth: 22
                Layout.preferredHeight: 22
                radius: 6
                color: "#33000000"
                AppIcon {
                    anchors.centerIn: parent
                    name: scrapWidgetRoot.isError ? "alert" : "globe"
                    color: scrapWidgetRoot.isError ? "#fb7185" : "#8b5cf6"
                    width: 13
                    height: 13
                }
            }

            // Title or clean domain
            Text {
                text: scrapWidgetRoot.title || scrapWidgetRoot.cleanDomain || qsTr("Snapshot Web Offline")
                color: scrapWidgetRoot.isError ? "#fda4af" : (hoverHandler.hovered ? "#ffffff" : "#fffffe")
                font.pixelSize: 12
                font.weight: Font.Medium
                elide: Text.ElideRight
                Layout.maximumWidth: 240

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: scrapWidgetRoot.viewerOpen = !scrapWidgetRoot.viewerOpen
                }
            }

            // File size badge
            Rectangle {
                visible: !scrapWidgetRoot.isError && !scrapWidgetRoot.isCapturing && scrapWidgetRoot.fileSize > 0
                Layout.preferredHeight: 18
                Layout.preferredWidth: sizeLbl.implicitWidth + 10
                radius: 4
                color: "#0dffffff"
                Text {
                    id: sizeLbl
                    anchors.centerIn: parent
                    text: scrapWidgetRoot.formatBytes(scrapWidgetRoot.fileSize)
                    color: "#99fffffe"
                    font.pixelSize: 10
                    font.family: "monospace"
                }
            }

            // Cloud / Local offline indicator icon
            AppIcon {
                visible: !scrapWidgetRoot.isError && !scrapWidgetRoot.isCapturing
                name: scrapWidgetRoot.driveFileId.length > 0 ? "cloud" : "hard-drive"
                color: scrapWidgetRoot.driveFileId.length > 0 ? "#cc60a5fa" : "#ccfbbf24"
                width: 11
                height: 11
            }

            // Hover-revealed quick actions matching ScrapWidgetNodeView.tsx
            RowLayout {
                opacity: hoverHandler.hovered || scrapWidgetRoot.viewerOpen ? 1 : 0
                Behavior on opacity { NumberAnimation { duration: 150 } }
                spacing: 2

                ToolButton {
                    Layout.preferredWidth: 22
                    Layout.preferredHeight: 22
                    focusPolicy: Qt.NoFocus
                    ToolTip.visible: hovered
                    ToolTip.text: qsTr("Abrir em tela cheia (Desktop/Tablet/Mobile)")
                    onClicked: {
                        scrapModal.scrapTitle = scrapWidgetRoot.title || scrapWidgetRoot.cleanDomain
                        scrapModal.scrapUrl = scrapWidgetRoot.scrapUrl
                        scrapModal.htmlContent = scrapWidgetRoot.excerpt
                        scrapModal.open()
                    }
                    background: Rectangle { radius: 4; color: parent.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "maximize"; color: parent.hovered ? "#fffffe" : "#a7a9be"; width: 12; height: 12 }
                }

                ToolButton {
                    Layout.preferredWidth: 22
                    Layout.preferredHeight: 22
                    focusPolicy: Qt.NoFocus
                    ToolTip.visible: hovered
                    ToolTip.text: scrapWidgetRoot.viewerOpen ? qsTr("Fechar prévia") : qsTr("Visualizar captura")
                    onClicked: scrapWidgetRoot.viewerOpen = !scrapWidgetRoot.viewerOpen
                    background: Rectangle { radius: 4; color: parent.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon {
                        anchors.centerIn: parent
                        name: "eye"
                        color: parent.hovered ? "#fffffe" : "#a7a9be"
                        width: 12
                        height: 12
                    }
                }

                ToolButton {
                    visible: scrapWidgetRoot.scrapUrl.length > 0
                    Layout.preferredWidth: 22
                    Layout.preferredHeight: 22
                    focusPolicy: Qt.NoFocus
                    ToolTip.visible: hovered
                    ToolTip.text: qsTr("Abrir página original no navegador")
                    onClicked: Qt.openUrlExternally(scrapWidgetRoot.scrapUrl)
                    background: Rectangle { radius: 4; color: parent.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon {
                        anchors.centerIn: parent
                        name: "external-link"
                        color: parent.hovered ? "#fffffe" : "#a7a9be"
                        width: 12
                        height: 12
                    }
                }

                ToolButton {
                    Layout.preferredWidth: 22
                    Layout.preferredHeight: 22
                    focusPolicy: Qt.NoFocus
                    ToolTip.visible: hovered
                    ToolTip.text: qsTr("Remover captura")
                    onClicked: scrapWidgetRoot.removeRequested()
                    background: Rectangle { radius: 4; color: parent.hovered ? "#22ef4444" : "transparent" }
                    contentItem: AppIcon {
                        anchors.centerIn: parent
                        name: "trash"
                        color: parent.hovered ? "#fb7185" : "#a7a9be"
                        width: 12
                        height: 12
                    }
                }
            }
        }

        Rectangle {
            visible: scrapWidgetRoot.viewerOpen
            Layout.fillWidth: true
            implicitHeight: Math.min(240, previewLbl.implicitHeight + 20)
            radius: 8
            color: "#0f0e17"
            border.color: "#14ffffff"
            border.width: 1
            clip: true

            ScrollView {
                anchors.fill: parent
                anchors.margins: 10
                clip: true
                Text {
                    id: previewLbl
                    width: parent.width
                    text: scrapWidgetRoot.excerpt.length > 0
                        ? scrapWidgetRoot.excerpt
                        : (scrapWidgetRoot.scrapUrl || qsTr("Snapshot salvo localmente."))
                    textFormat: Text.RichText
                    color: "#cbd5e1"
                    font.pixelSize: 12
                    wrapMode: Text.WordWrap
                }
            }
        }
        ScrapViewerModal {
            id: scrapModal
        }
    }
}
