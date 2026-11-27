import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: footer
    objectName: "movePageModalFooter"
    property string selectedLocation: ""
    property bool submitting: false
    property bool sameLocation: false
    property bool validTarget: false
    signal cancel()
    signal move()

    implicitHeight: 76
    color: "#05ffffff"

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 16
        anchors.rightMargin: 12
        spacing: 8

        ColumnLayout {
            Layout.fillWidth: true
            spacing: 2
            Text {
                text: qsTr("Novo Destino:")
                color: "#a1a1aa"
                font.pixelSize: 10
            }
            Text {
                Layout.fillWidth: true
                text: footer.selectedLocation
                color: "#ffffff"
                font.pixelSize: 12
                font.weight: Font.DemiBold
                elide: Text.ElideRight
            }
        }

        Button {
            id: cancelButton
            text: qsTr("Cancelar")
            enabled: !footer.submitting
            onClicked: footer.cancel()
            background: Rectangle {
                radius: 10
                color: cancelButton.hovered ? "#0dffffff" : "transparent"
            }
            contentItem: Text {
                text: cancelButton.text
                color: "#a1a1aa"
                font.pixelSize: 12
                font.weight: Font.Medium
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
                leftPadding: 8
                rightPadding: 8
            }
        }

        Button {
            id: moveButton
            objectName: "confirmMoveButton"
            text: footer.submitting ? qsTr("Movendo...") : footer.sameLocation ? qsTr("Local Atual") : qsTr("Mover Aqui")
            enabled: !footer.submitting && footer.validTarget && !footer.sameLocation
            onClicked: footer.move()
            background: Rectangle {
                radius: 10
                color: moveButton.enabled ? (moveButton.hovered ? "#7c3aed" : "#8b5cf6") : "#403b50"
            }
            contentItem: RowLayout {
                id: moveButtonContent
                spacing: 6
                AppIcon {
                    Layout.preferredWidth: 14
                    Layout.preferredHeight: 14
            name: "folder"
                    color: "#ffffff"
                }
                Text {
                    text: moveButton.text
                    color: "#ffffff"
                    font.pixelSize: 12
                    font.weight: Font.DemiBold
                }
            }
            leftPadding: 12
            rightPadding: 12
        }
    }

    Rectangle {
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.top: parent.top
        height: 1
        color: "#ffffff"
        opacity: 0.1
    }
}
