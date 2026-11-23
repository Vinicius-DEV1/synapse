import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: sidebarRoot
    Layout.preferredWidth: 280
    Layout.fillHeight: true
    color: "#161524"
    border.color: "#12ffffff"
    border.width: 1

    property var sessions: []
    property var activeSession: null

    signal sessionSelected(var session)
    signal deleteRequested(string id, string title)
    signal newSessionRequested()

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 16
        spacing: 14

        // Sidebar Header
        RowLayout {
            Layout.fillWidth: true
            spacing: 8
            Text { text: "💬"; font.pixelSize: 18 }
            Text { text: "Sessões"; color: "#fffffe"; font.pixelSize: 16; font.bold: true; Layout.fillWidth: true }
            Rectangle {
                Layout.preferredWidth: 76
                Layout.preferredHeight: 30
                radius: 6
                color: "#8b5cf6"
                Text { anchors.centerIn: parent; text: "+ Nova"; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
                MouseArea {
                    anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                    onClicked: sidebarRoot.newSessionRequested()
                }
            }
        }

        Rectangle { Layout.fillWidth: true; Layout.preferredHeight: 1; color: "#10ffffff" }

        // Sessions List
        ListView {
            id: sessionsListView
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            spacing: 6
            model: sidebarRoot.sessions

            delegate: Rectangle {
                required property var modelData
                width: sessionsListView.width
                height: 54
                radius: 8
                color: (sidebarRoot.activeSession && sidebarRoot.activeSession.id === modelData.id) ? "#268b5cf6" : (sessMouse.containsMouse ? "#1f1d2e" : "transparent")
                border.color: (sidebarRoot.activeSession && sidebarRoot.activeSession.id === modelData.id) ? "#558b5cf6" : "transparent"

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 8

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 2
                        Text {
                            text: modelData.title || "Sessão"
                            color: (sidebarRoot.activeSession && sidebarRoot.activeSession.id === modelData.id) ? "#fffffe" : "#c4c4d0"
                            font.pixelSize: 13
                            font.bold: true
                            elide: Text.ElideRight
                            Layout.fillWidth: true
                        }
                        Text {
                            text: modelData.started_at ? modelData.started_at.substring(0, 10) : ""
                            color: "#64748b"
                            font.pixelSize: 10
                        }
                    }

                    // Delete button
                    Rectangle {
                        Layout.preferredWidth: 26
                        Layout.preferredHeight: 26
                        radius: 4
                        color: delMouse.containsMouse ? "#33f43f5e" : "transparent"
                        Text { anchors.centerIn: parent; text: "🗑️"; font.pixelSize: 11 }
                        MouseArea {
                            id: delMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: sidebarRoot.deleteRequested(modelData.id, modelData.title || qsTr("Sessão"))
                        }
                    }
                }

                MouseArea {
                    id: sessMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    z: -1
                    onClicked: sidebarRoot.sessionSelected(modelData)
                }
            }

            // Empty state
            Text {
                anchors.centerIn: parent
                visible: sidebarRoot.sessions.length === 0
                text: "Nenhuma sessão ainda.\nClique em '+ Nova'."
                color: "#64748b"
                font.pixelSize: 12
                horizontalAlignment: Text.AlignHCenter
            }
        }
    }
}
