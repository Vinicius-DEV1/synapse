import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Item {
    id: deleteDialogRoot
    anchors.fill: parent
    visible: isOpen
    z: 100

    property bool isOpen: false
    property string fileName: ""
    signal confirmed()
    signal closed()

    Rectangle {
        anchors.fill: parent
        color: "#b0000000"
        MouseArea {
            anchors.fill: parent
            onClicked: deleteDialogRoot.closed()
        }
    }

    Rectangle {
        width: 380
        height: cardCol.implicitHeight + 48
        anchors.centerIn: parent
        radius: 18
        color: "#16161e"
        border.color: "#2e2e38"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            id: cardCol
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            RowLayout {
                spacing: 12
                Rectangle {
                    Layout.preferredWidth: 40
                    Layout.preferredHeight: 40
                    radius: 10
                    color: "#2a151b"
                    border.color: "#ef4444"
                    border.width: 1

                    AppIcon {
                        anchors.centerIn: parent
                        name: "trash"
                        color: "#ef4444"
                        Layout.preferredWidth: 18
                        Layout.preferredHeight: 18
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Text {
                        text: "Remover Anexo"
                        color: "#fffffe"
                        font.pixelSize: 15
                        font.weight: Font.Bold
                    }
                    Text {
                        text: "Remover \"" + deleteDialogRoot.fileName + "\" da nota?"
                        color: "#a7a9be"
                        font.pixelSize: 12
                        elide: Text.ElideRight
                        Layout.fillWidth: true
                    }
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Item { Layout.fillWidth: true }

                Rectangle {
                    Layout.preferredWidth: 84
                    Layout.preferredHeight: 34
                    radius: 8
                    color: cancelMouse.containsMouse ? "#2e2e38" : "transparent"
                    border.color: "#2e2e38"
                    border.width: 1

                    Text {
                        anchors.centerIn: parent
                        text: "Cancelar"
                        color: "#a7a9be"
                        font.pixelSize: 12
                    }

                    MouseArea {
                        id: cancelMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: deleteDialogRoot.closed()
                    }
                }

                Rectangle {
                    Layout.preferredWidth: 84
                    Layout.preferredHeight: 34
                    radius: 8
                    color: delMouse.containsMouse ? "#dc2626" : "#ef4444"

                    Text {
                        anchors.centerIn: parent
                        text: "Remover"
                        color: "#ffffff"
                        font.pixelSize: 12
                        font.weight: Font.DemiBold
                    }

                    MouseArea {
                        id: delMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            deleteDialogRoot.confirmed()
                            deleteDialogRoot.closed()
                        }
                    }
                }
            }
        }
    }
}
