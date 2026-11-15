import QtQuick 2.15
import QtQuick.Layouts 1.15
import ".."

Item {
    id: deleteModalRoot
    anchors.fill: parent
    visible: isOpen
    z: 100

    property bool isOpen: false
    property string itemName: ""
    signal confirmed()
    signal closed()

    // Backdrop
    Rectangle {
        anchors.fill: parent
        color: "#b0000000"
        MouseArea {
            anchors.fill: parent
            onClicked: deleteModalRoot.closed()
        }
    }

    // Modal Card
    Rectangle {
        width: 400
        height: cardCol.implicitHeight + 48
        anchors.centerIn: parent
        radius: 20
        color: "#16161e"
        border.color: "#2e2e38"
        border.width: 1

        MouseArea {
            anchors.fill: parent
        }

        ColumnLayout {
            id: cardCol
            anchors.fill: parent
            anchors.margins: 24
            spacing: 20

            RowLayout {
                Layout.fillWidth: true
                spacing: 16

                Rectangle {
                    Layout.preferredWidth: 44
                    Layout.preferredHeight: 44
                    radius: 12
                    color: "#2a151b"
                    border.color: "#ef4444"
                    border.width: 1

                    AppIcon {
                        anchors.centerIn: parent
                        name: "trash"
                        color: "#ef4444"
                        Layout.preferredWidth: 20
                        Layout.preferredHeight: 20
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4

                    Text {
                        text: "Excluir Credencial"
                        color: "#fffffe"
                        font.pixelSize: 16
                        font.weight: Font.Bold
                    }

                    Text {
                        Layout.fillWidth: true
                        text: "Tem certeza que deseja remover \"" + (deleteModalRoot.itemName || "este item") + "\"? Esta ação não pode ser desfeita."
                        color: "#a7a9be"
                        font.pixelSize: 12
                        wrapMode: Text.WordWrap
                    }
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Item { Layout.fillWidth: true }

                Rectangle {
                    Layout.preferredWidth: 90
                    Layout.preferredHeight: 36
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
                        onClicked: deleteModalRoot.closed()
                    }
                }

                Rectangle {
                    Layout.preferredWidth: 90
                    Layout.preferredHeight: 36
                    radius: 8
                    color: delMouse.containsMouse ? "#dc2626" : "#ef4444"

                    Text {
                        anchors.centerIn: parent
                        text: "Excluir"
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
                            deleteModalRoot.confirmed()
                            deleteModalRoot.closed()
                        }
                    }
                }
            }
        }
    }
}
