import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: sessionListRoot
    width: 280
    height: 340
    radius: 12
    color: "#161524"
    border.color: "#38354d"
    border.width: 1
    visible: false
    z: 110

    property var sessions: []
    property string activeSessionId: ""

    signal sessionSelected(string sessionId)
    signal newSessionRequested()
    signal deleteSessionRequested(string sessionId)
    signal closeRequested()

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 14
        spacing: 10

        // Header
        RowLayout {
            Layout.fillWidth: true
            spacing: 8

            Text {
                text: "Histórico de Chats IA"
                color: "#fffffe"
                font.pixelSize: 14
                font.bold: true
                Layout.fillWidth: true
            }

            Button {
                text: "+ Novo"
                background: Rectangle { color: "#8b5cf6"; radius: 6 }
                contentItem: Text { text: parent.text; color: "#ffffff"; font.pixelSize: 11; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                onClicked: {
                    sessionListRoot.newSessionRequested()
                    sessionListRoot.visible = false
                }
            }

            Button {
                text: "✕"
                flat: true
                onClicked: sessionListRoot.closeRequested()
            }
        }

        // Sessions list
        ListView {
            id: sList
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            model: sessionListRoot.sessions
            spacing: 4

            delegate: Rectangle {
                width: sList.width
                height: 38
                radius: 6
                property bool isActive: modelData.id === sessionListRoot.activeSessionId
                color: isActive ? "#2a273f" : (sMouse.containsMouse ? "#1f1d2e" : "transparent")

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 8
                    spacing: 8

                    Text { text: "💬"; font.pixelSize: 12 }
                    Text {
                        text: modelData.title || "Conversa IA"
                        color: parent.parent.isActive ? "#c4b5fd" : "#fffffe"
                        font.pixelSize: 12
                        font.bold: parent.parent.isActive
                        elide: Text.ElideRight
                        Layout.fillWidth: true
                    }

                    Button {
                        text: "✕"
                        flat: true
                        contentItem: Text { text: "✕"; color: "#94a1b2"; font.pixelSize: 10 }
                        onClicked: sessionListRoot.deleteSessionRequested(modelData.id)
                    }
                }

                MouseArea {
                    id: sMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: {
                        sessionListRoot.sessionSelected(modelData.id)
                        sessionListRoot.visible = false
                    }
                }
            }

            Text {
                anchors.centerIn: parent
                text: "Nenhuma sessão ainda"
                color: "#6b7280"
                font.pixelSize: 12
                visible: sList.count === 0
            }
        }
    }
}
