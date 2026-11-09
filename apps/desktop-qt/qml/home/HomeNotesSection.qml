import QtQuick 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: notesRoot
    Layout.fillWidth: true
    Layout.preferredWidth: 440
    spacing: 20

    property var pinnedPages: []
    property var recentPages: []

    signal noteSelected(string pageId)

    // Pinned Pages Card
    Rectangle {
        Layout.fillWidth: true
        radius: 14
        color: "#1a1924"
        border.color: "#ffffff0f"
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 20
            spacing: 12

            Text { text: "📌 Notas Fixadas"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }

            Repeater {
                model: notesRoot.pinnedPages.slice(0, 6)
                delegate: Rectangle {
                    Layout.fillWidth: true
                    height: 38
                    radius: 8
                    color: pinMouse.containsMouse ? "#201e30" : "#15141b"
                    border.color: pinMouse.containsMouse ? "#8b5cf644" : "transparent"

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 10
                        Text { text: modelData.icon || "📄"; font.pixelSize: 13 }
                        Text {
                            text: modelData.title || "Sem título"
                            color: "#fffffe"
                            font.pixelSize: 12
                            font.bold: true
                            elide: Text.ElideRight
                            Layout.fillWidth: true
                        }
                    }
                    MouseArea {
                        id: pinMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: notesRoot.noteSelected(modelData.id)
                    }
                }
            }
        }
    }

    // Recently Modified Pages Card
    Rectangle {
        Layout.fillWidth: true
        radius: 14
        color: "#1a1924"
        border.color: "#ffffff0f"
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 20
            spacing: 12

            Text { text: "🕒 Notas Recentes"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }

            Repeater {
                model: notesRoot.recentPages
                delegate: Rectangle {
                    Layout.fillWidth: true
                    height: 38
                    radius: 8
                    color: recMouse.containsMouse ? "#201e30" : "#15141b"
                    border.color: recMouse.containsMouse ? "#8b5cf644" : "transparent"

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 10
                        Text { text: modelData.icon || "📄"; font.pixelSize: 13 }
                        Text {
                            text: modelData.title || "Sem título"
                            color: "#a7a9be"
                            font.pixelSize: 12
                            elide: Text.ElideRight
                            Layout.fillWidth: true
                        }
                        Text {
                            text: modelData.updated_at ? modelData.updated_at.substring(0, 10) : ""
                            color: "#64748b"
                            font.pixelSize: 10
                        }
                    }
                    MouseArea {
                        id: recMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: notesRoot.noteSelected(modelData.id)
                    }
                }
            }
        }
    }
}

