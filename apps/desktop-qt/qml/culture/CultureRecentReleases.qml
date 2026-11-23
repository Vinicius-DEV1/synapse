import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: releasesRoot
    Layout.fillWidth: true
    Layout.preferredHeight: visible ? 104 : 0
    radius: 12
    color: "#151422"
    border.color: "#228b5cf6"
    visible: recentItems.length > 0

    property var allItems: []
    readonly property var recentItems: {
        if (!allItems || allItems.length === 0) return []
        var active = allItems.filter(function(item) {
            return item.status === "watching" && Number(item.total_episodes || 0) > Number(item.progress || 0)
        })
        return active.slice(0, 8)
    }

    signal itemSelected(var item)
    signal incrementRequested(string itemId)

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 10
        spacing: 8

        RowLayout {
            Layout.fillWidth: true
            Text {
                text: "🕒 Em Acompanhamento Agora"
                color: "#c4b5fd"
                font.pixelSize: 11
                font.bold: true
            }
            Item { Layout.fillWidth: true }
            Text {
                text: releasesRoot.recentItems.length + " obra(s) em andamento"
                color: "#94a1b2"
                font.pixelSize: 10
            }
        }

        Flickable {
            Layout.fillWidth: true
            Layout.fillHeight: true
            contentWidth: releaseRow.implicitWidth
            clip: true
            flickableDirection: Flickable.HorizontalFlick

            RowLayout {
                id: releaseRow
                spacing: 10
                Repeater {
                    model: releasesRoot.recentItems
                    delegate: Rectangle {
                        required property var modelData
                        width: 220
                        height: 54
                        radius: 9
                        color: "#1e1c2e"
                        border.color: "#18ffffff"

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 8
                            spacing: 8
                            Text {
                                text: modelData.type === "filme" ? "🎬" : (modelData.type === "anime" ? "⛩️" : "📺")
                                font.pixelSize: 16
                            }
                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2
                                Text {
                                    Layout.fillWidth: true
                                    text: modelData.title || ""
                                    color: "#fffffe"
                                    font.pixelSize: 11
                                    font.bold: true
                                    elide: Text.ElideRight
                                }
                                Text {
                                    text: "Ep. " + (modelData.progress || 0) + "/" + (modelData.total_episodes || "?")
                                    color: "#a78bfa"
                                    font.pixelSize: 10
                                }
                            }
                            Rectangle {
                                width: 38; height: 24; radius: 6
                                color: "#268b5cf6"
                                border.color: "#558b5cf6"
                                Text { anchors.centerIn: parent; text: "+1"; color: "#c4b5fd"; font.pixelSize: 10; font.bold: true }
                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: releasesRoot.incrementRequested(modelData.id)
                                }
                            }
                        }

                        MouseArea {
                            anchors.fill: parent
                            z: -1
                            cursorShape: Qt.PointingHandCursor
                            onClicked: releasesRoot.itemSelected(modelData)
                        }
                    }
                }
            }
        }
    }
}
