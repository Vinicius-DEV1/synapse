import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Item {
    id: deleteModalRoot
    anchors.fill: parent
    visible: isOpen
    z: 200

    property bool isOpen: false
    property string itemTitle: ""
    property string itemId: ""
    property string deleteType: "session" // "session" or "memory"
    property bool isDeleting: false

    signal confirmed(string id, string type)
    signal cancelled()

    Theme { id: theme }

    Shortcut {
        sequence: "Escape"
        enabled: deleteModalRoot.isOpen && !deleteModalRoot.isDeleting
        onActivated: deleteModalRoot.cancelled()
    }

    Rectangle {
        anchors.fill: parent
        color: "#aa000000"

        MouseArea {
            anchors.fill: parent
            enabled: !deleteModalRoot.isDeleting
            onClicked: deleteModalRoot.cancelled()
        }
    }

    Rectangle {
        id: dialogBox
        width: Math.min(420, parent.width - 32)
        height: contentCol.implicitHeight + 48
        radius: 16
        color: theme.bgDarkCard
        border.color: theme.borderCard
        anchors.centerIn: parent

        MouseArea {
            anchors.fill: parent
            onClicked: function(mouse) { mouse.accepted = true }
        }

        ColumnLayout {
            id: contentCol
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            RowLayout {
                spacing: 12

                Rectangle {
                    width: 40; height: 40; radius: 20
                    color: theme.errorBg
                    AppIcon {
                        anchors.centerIn: parent
                        width: 20; height: 20
                        name: "trash"
                        color: theme.error
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2

                    Text {
                        text: deleteModalRoot.deleteType === "session" ? qsTr("Excluir Sessão de Prática") : qsTr("Excluir Memória do Tutor")
                        color: theme.textDark
                        font.pixelSize: 15
                        font.bold: true
                    }

                    Text {
                        text: qsTr("Esta ação não poderá ser desfeita.")
                        color: theme.textSubtext
                        font.pixelSize: 12
                    }
                }
            }

            Text {
                Layout.fillWidth: true
                text: deleteModalRoot.deleteType === "session"
                    ? qsTr("Tem certeza que deseja excluir permanentemente a sessão de prática '") + deleteModalRoot.itemTitle + qsTr("'? Todos os turnos e áudios gravados serão removidos.")
                    : qsTr("Tem certeza que deseja remover esta instrução de memória do tutor de IA?")
                color: theme.textSubtext
                font.pixelSize: 13
                wrapMode: Text.Wrap
            }

            Rectangle { Layout.fillWidth: true; height: 1; color: theme.borderSubtle }

            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Item { Layout.fillWidth: true }

                // Cancel Button
                Rectangle {
                    Layout.preferredWidth: 100
                    Layout.preferredHeight: 36
                    radius: 8
                    color: cancelMouse.containsMouse ? theme.bgHover : "transparent"
                    border.color: theme.borderSubtle

                    Text {
                        anchors.centerIn: parent
                        text: qsTr("Cancelar")
                        color: theme.textSubtext
                        font.pixelSize: 12
                        font.bold: true
                    }

                    MouseArea {
                        id: cancelMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: deleteModalRoot.cancelled()
                    }
                }

                // Delete Button
                Rectangle {
                    Layout.preferredWidth: 110
                    Layout.preferredHeight: 36
                    radius: 8
                    color: delBtnMouse.containsMouse ? "#dc2626" : theme.error

                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 6

                        AppIcon {
                            width: 14; height: 14
                            name: "trash"
                            color: "#ffffff"
                        }

                        Text {
                            text: deleteModalRoot.isDeleting ? qsTr("Excluindo...") : qsTr("Excluir")
                            color: "#ffffff"
                            font.pixelSize: 12
                            font.bold: true
                        }
                    }

                    MouseArea {
                        id: delBtnMouse
                        anchors.fill: parent
                        enabled: !deleteModalRoot.isDeleting
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: deleteModalRoot.confirmed(deleteModalRoot.itemId, deleteModalRoot.deleteType)
                    }
                }
            }
        }
    }
}
