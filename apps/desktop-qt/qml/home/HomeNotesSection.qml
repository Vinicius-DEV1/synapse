import QtQuick 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: notesRoot
    Layout.fillWidth: true
    Layout.preferredWidth: 420
    spacing: 20

    property var pinnedPages: []
    property var recentPages: []

    signal noteSelected(string pageId)

    // 1. Recent Pages Card (Matching Image 1 & HomePagesSection.tsx)
    Rectangle {
        Layout.fillWidth: true
        implicitHeight: recentCol.implicitHeight + 44
        radius: 16
        color: theme.bgDarkCard
        border.color: theme.borderCard
        border.width: 1

        ColumnLayout {
            id: recentCol
            anchors.left: parent.left
            anchors.right: parent.right
            anchors.top: parent.top
            anchors.margins: 22
            spacing: 14

            // Header: Purple Clock Icon + Recentes
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Rectangle {
                    width: 34; height: 34; radius: 8
                    color: "#208b5cf6"
                    Text { anchors.centerIn: parent; text: "🕒"; font.pixelSize: 15 }
                }

                Text {
                    text: "Recentes"
                    color: "#ffffff"
                    font.pixelSize: 16
                    font.bold: true
                    font.family: theme.fontFamily
                }
            }

            // Empty State
            Text {
                visible: notesRoot.recentPages.length === 0
                text: "Nenhuma página recente encontrada."
                color: theme.textMuted
                font.pixelSize: 12
                font.family: theme.fontFamily
                Layout.topMargin: 8
            }

            // List of Recent Pages (Pills matching Image 1)
            Repeater {
                model: notesRoot.recentPages.slice(0, 6)

                delegate: Rectangle {
                    Layout.fillWidth: true
                    height: 42
                    radius: 10
                    color: recMouse.containsMouse ? "#0cffffff" : "#05ffffff"
                    border.color: recMouse.containsMouse ? "#338b5cf6" : "transparent"
                    border.width: 1

                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 12
                        anchors.rightMargin: 12
                        spacing: 10

                        Text {
                            text: modelData.icon || "📄"
                            font.pixelSize: 14
                        }

                        Text {
                            Layout.fillWidth: true
                            text: modelData.title || "Sem título"
                            color: recMouse.containsMouse ? theme.brand300 : "#fffffe"
                            font.pixelSize: 13
                            font.weight: Font.Medium
                            font.family: theme.fontFamily
                            elide: Text.ElideRight
                        }

                        Text {
                            text: "→"
                            color: theme.textMuted
                            font.pixelSize: 12
                            visible: recMouse.containsMouse
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

    // 2. Pinned Pages Card (Visible when user has pinned pages)
    Rectangle {
        visible: notesRoot.pinnedPages.length > 0
        Layout.fillWidth: true
        implicitHeight: pinCol.implicitHeight + 44
        radius: 16
        color: theme.bgDarkCard
        border.color: theme.borderCard
        border.width: 1

        ColumnLayout {
            id: pinCol
            anchors.left: parent.left
            anchors.right: parent.right
            anchors.top: parent.top
            anchors.margins: 22
            spacing: 14

            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Rectangle {
                    width: 34; height: 34; radius: 8
                    color: "#208b5cf6"
                    Text { anchors.centerIn: parent; text: "📌"; font.pixelSize: 15 }
                }

                Text {
                    text: "Notas Fixadas"
                    color: "#ffffff"
                    font.pixelSize: 16
                    font.bold: true
                    font.family: theme.fontFamily
                }
            }

            Repeater {
                model: notesRoot.pinnedPages.slice(0, 5)

                delegate: Rectangle {
                    Layout.fillWidth: true
                    height: 40
                    radius: 10
                    color: pinMouse.containsMouse ? "#0cffffff" : "#05ffffff"
                    border.color: pinMouse.containsMouse ? "#338b5cf6" : "transparent"
                    border.width: 1

                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 12
                        anchors.rightMargin: 12
                        spacing: 10

                        Text { text: modelData.icon || "📄"; font.pixelSize: 13 }
                        Text {
                            text: modelData.title || "Sem título"
                            color: pinMouse.containsMouse ? theme.brand300 : "#fffffe"
                            font.pixelSize: 13
                            font.weight: Font.Medium
                            font.family: theme.fontFamily
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
}
