import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: header
    objectName: "movePageModalHeader"
    property string sourceTitle: ""
    property string currentLocation: ""
    signal dismiss()

    implicitHeight: 72
    color: "#05ffffff"

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 16
        anchors.rightMargin: 12
        spacing: 10

        Rectangle {
            Layout.preferredWidth: 34
            Layout.preferredHeight: 34
            radius: 10
            color: "#8b5cf6"
            opacity: 0.2
            AppIcon {
                anchors.centerIn: parent
                name: "folder"
                color: "#a78bfa"
                width: 18
                height: 18
            }
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: 2
            Text {
                objectName: "movePageSourceTitle"
                Layout.fillWidth: true
                text: qsTr("Mover “%1”").arg(header.sourceTitle)
                color: "#ffffff"
                font.pixelSize: 15
                font.weight: Font.DemiBold
                elide: Text.ElideRight
            }
            Text {
                objectName: "movePageCurrentLocation"
                Layout.fillWidth: true
                text: qsTr("Local atual: %1").arg(header.currentLocation)
                color: "#a1a1aa"
                font.pixelSize: 11
                elide: Text.ElideRight
            }
        }

        ToolButton {
            id: closeButton
            Accessible.name: qsTr("Fechar")
            onClicked: header.dismiss()
            contentItem: AppIcon {
                name: "close"
                color: closeButton.hovered ? "#ffffff" : "#a1a1aa"
                width: 18
                height: 18
            }
            background: Rectangle {
                radius: 8
                color: closeButton.hovered ? "#1affffff" : "transparent"
            }
        }
    }

    Rectangle {
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        height: 1
        color: "#ffffff"
        opacity: 0.1
    }
}
