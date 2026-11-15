import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Popup {
    id: pageContextMenu
    padding: 6
    closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
    dim: false

    property string targetPageId: ""
    property bool isPinned: false

    signal openRequested(string pageId)
    signal openInNewTabRequested(string pageId)
    signal createSubRequested(string pageId)
    signal togglePinRequested(string pageId)
    signal moveRequested(string pageId)
    signal renameRequested(string pageId)
    signal deleteRequested(string pageId)

    Theme { id: theme }

    background: Rectangle {
        color: theme.bgDarkCard
        radius: 10
        border.color: theme.borderBrand
        border.width: 1
    }

    contentItem: ColumnLayout {
        spacing: 2
        Layout.preferredWidth: 190

        // Abrir em nova aba
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 30
            radius: 6
            color: newTabMouse.containsMouse ? theme.bgHover : "transparent"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 8
                anchors.rightMargin: 8
                spacing: 8

                AppIcon {
                    Layout.preferredWidth: 14
                    Layout.preferredHeight: 14
                    name: "plus"
                    color: theme.brand400
                }
                Text {
                    text: qsTr("Abrir em nova aba")
                    color: theme.textDark
                    font.pixelSize: 12
                    font.family: theme.fontFamily
                    Layout.fillWidth: true
                }
            }
            MouseArea {
                id: newTabMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    pageContextMenu.close()
                    pageContextMenu.openInNewTabRequested(pageContextMenu.targetPageId)
                }
            }
        }

        // Criar subpágina
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 30
            radius: 6
            color: subMouse.containsMouse ? theme.bgHover : "transparent"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 8
                anchors.rightMargin: 8
                spacing: 8

                AppIcon {
                    Layout.preferredWidth: 14
                    Layout.preferredHeight: 14
                    name: "notes"
                    color: theme.textSubtext
                }
                Text {
                    text: qsTr("Criar subpágina")
                    color: theme.textDark
                    font.pixelSize: 12
                    font.family: theme.fontFamily
                    Layout.fillWidth: true
                }
            }
            MouseArea {
                id: subMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    pageContextMenu.close()
                    pageContextMenu.createSubRequested(pageContextMenu.targetPageId)
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 1
            color: theme.borderSubtle
        }

        // Fixar / Desafixar
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 30
            radius: 6
            color: pinMouse.containsMouse ? theme.bgHover : "transparent"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 8
                anchors.rightMargin: 8
                spacing: 8

                AppIcon {
                    Layout.preferredWidth: 14
                    Layout.preferredHeight: 14
                    name: pageContextMenu.isPinned ? "pin-off" : "pin"
                    color: theme.textSubtext
                }
                Text {
                    text: pageContextMenu.isPinned ? qsTr("Desafixar") : qsTr("Fixar no topo")
                    color: theme.textDark
                    font.pixelSize: 12
                    font.family: theme.fontFamily
                    Layout.fillWidth: true
                }
            }
            MouseArea {
                id: pinMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    pageContextMenu.close()
                    pageContextMenu.togglePinRequested(pageContextMenu.targetPageId)
                }
            }
        }

        // Mover página
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 30
            radius: 6
            color: moveMouse.containsMouse ? theme.bgHover : "transparent"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 8
                anchors.rightMargin: 8
                spacing: 8

                AppIcon {
                    Layout.preferredWidth: 14
                    Layout.preferredHeight: 14
                    name: "folder"
                    color: theme.textSubtext
                }
                Text {
                    text: qsTr("Mover para...")
                    color: theme.textDark
                    font.pixelSize: 12
                    font.family: theme.fontFamily
                    Layout.fillWidth: true
                }
            }
            MouseArea {
                id: moveMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    pageContextMenu.close()
                    pageContextMenu.moveRequested(pageContextMenu.targetPageId)
                }
            }
        }

        // Renomear página
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 30
            radius: 6
            color: renameMouse.containsMouse ? theme.bgHover : "transparent"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 8
                anchors.rightMargin: 8
                spacing: 8

                AppIcon {
                    Layout.preferredWidth: 14
                    Layout.preferredHeight: 14
                    name: "edit"
                    color: theme.textSubtext
                }
                Text {
                    text: qsTr("Renomear")
                    color: theme.textDark
                    font.pixelSize: 12
                    font.family: theme.fontFamily
                    Layout.fillWidth: true
                }
            }
            MouseArea {
                id: renameMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    pageContextMenu.close()
                    pageContextMenu.renameRequested(pageContextMenu.targetPageId)
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 1
            color: theme.borderSubtle
        }

        // Excluir página
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 30
            radius: 6
            color: deleteMouse.containsMouse ? theme.bgHover : "transparent"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 8
                anchors.rightMargin: 8
                spacing: 8

                AppIcon {
                    Layout.preferredWidth: 14
                    Layout.preferredHeight: 14
                    name: "trash"
                    color: theme.error
                }
                Text {
                    text: qsTr("Mover para lixeira")
                    color: theme.error
                    font.pixelSize: 12
                    font.family: theme.fontFamily
                    Layout.fillWidth: true
                }
            }
            MouseArea {
                id: deleteMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    pageContextMenu.close()
                    pageContextMenu.deleteRequested(pageContextMenu.targetPageId)
                }
            }
        }
    }
}
