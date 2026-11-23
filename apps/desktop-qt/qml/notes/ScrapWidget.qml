import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: scrapWidgetRoot
    Layout.fillWidth: true
    implicitHeight: mainCol.implicitHeight + 20
    radius: 12
    color: "#151422"
    border.color: hoverHandler.hovered ? "#4406b6d4" : "#18ffffff"
    border.width: 1

    property var blockData: ({})
    property var attrs: blockData.attrs || ({})
    property string scrapUrl: attrs["data-url"] || attrs["url"] || ""
    property string title: attrs["data-title"] || attrs["title"] || qsTr("Captura Web Offline")
    property string excerpt: attrs["data-content"] || attrs["data-excerpt"] || blockData.innerHtml || ""
    property bool viewerOpen: false

    signal removeRequested()

    HoverHandler { id: hoverHandler }

    ColumnLayout {
        id: mainCol
        anchors.fill: parent
        anchors.margins: 12
        spacing: 8

        RowLayout {
            Layout.fillWidth: true
            spacing: 10
            Rectangle {
                Layout.preferredWidth: 32
                Layout.preferredHeight: 32
                radius: 8
                color: "#2206b6d4"
                AppIcon { anchors.centerIn: parent; name: "external-link"; color: "#22d3ee"; width: 16; height: 16 }
            }
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2
                Text { text: scrapWidgetRoot.title; color: "#fffffe"; font.pixelSize: 13; font.weight: Font.DemiBold; elide: Text.ElideRight; Layout.fillWidth: true }
                Text { text: scrapWidgetRoot.scrapUrl || qsTr("Snapshot salvo localmente"); color: "#71717a"; font.pixelSize: 11; elide: Text.ElideRight; Layout.fillWidth: true }
            }
            Button {
                Layout.preferredHeight: 26
                padding: 8
                onClicked: scrapWidgetRoot.viewerOpen = !scrapWidgetRoot.viewerOpen
                background: Rectangle { radius: 6; color: "#1f1e2e"; border.color: "#2e2e38" }
                contentItem: Text { text: scrapWidgetRoot.viewerOpen ? qsTr("Fechar") : qsTr("Ler captura"); color: "#e2e8f0"; font.pixelSize: 11 }
            }
            ToolButton {
                visible: hoverHandler.hovered
                Layout.preferredWidth: 26
                Layout.preferredHeight: 26
                onClicked: scrapWidgetRoot.removeRequested()
                background: Rectangle { radius: 5; color: parent.hovered ? "#22ef4444" : "transparent" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: "#fda4af"; width: 12; height: 12 }
            }
        }

        Rectangle {
            visible: scrapWidgetRoot.viewerOpen && scrapWidgetRoot.excerpt.length > 0
            Layout.fillWidth: true
            implicitHeight: Math.min(280, previewLbl.implicitHeight + 16)
            radius: 8
            color: "#0b0b12"
            border.color: "#15ffffff"
            clip: true
            ScrollView {
                anchors.fill: parent
                anchors.margins: 8
                clip: true
                Text {
                    id: previewLbl
                    width: parent.width
                    text: scrapWidgetRoot.excerpt
                    textFormat: Text.RichText
                    color: "#cbd5e1"
                    font.pixelSize: 12
                    wrapMode: Text.WordWrap
                }
            }
        }
    }
}
