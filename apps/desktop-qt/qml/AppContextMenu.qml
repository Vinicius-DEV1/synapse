import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Popup {
    id: appContextMenu
    padding: 6
    closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
    dim: false

    signal actionTriggered(string actionKey)

    Theme { id: theme }

    background: Rectangle {
        color: theme.bgDarkCard
        radius: 10
        border.color: theme.borderBrand
        border.width: 1
    }

    contentItem: ColumnLayout {
        spacing: 2
        Layout.preferredWidth: 200

        // Nova Página
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 30
            radius: 6
            color: newPageMouse.containsMouse ? theme.bgHover : "transparent"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 8
                anchors.rightMargin: 8
                spacing: 8

                AppIcon {
                    Layout.preferredWidth: 14
                    Layout.preferredHeight: 14
                    name: "notes"
                    color: theme.brand400
                }
                Text {
                    text: qsTr("Nova página")
                    color: theme.textDark
                    font.pixelSize: 12
                    font.family: theme.fontFamily
                    Layout.fillWidth: true
                }
                Text {
                    text: "Ctrl+N"
                    color: theme.textMuted
                    font.pixelSize: 10
                    font.family: theme.fontMono
                }
            }
            MouseArea {
                id: newPageMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    appContextMenu.close()
                    appContextMenu.actionTriggered("new_note")
                }
            }
        }

        // Novo Evento
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 30
            radius: 6
            color: newEventMouse.containsMouse ? theme.bgHover : "transparent"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 8
                anchors.rightMargin: 8
                spacing: 8

                AppIcon {
                    Layout.preferredWidth: 14
                    Layout.preferredHeight: 14
                    name: "calendar"
                    color: theme.textSubtext
                }
                Text {
                    text: qsTr("Novo evento")
                    color: theme.textDark
                    font.pixelSize: 12
                    font.family: theme.fontFamily
                    Layout.fillWidth: true
                }
            }
            MouseArea {
                id: newEventMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    appContextMenu.close()
                    appContextMenu.actionTriggered("new_event")
                }
            }
        }

        // Novo Hábito
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 30
            radius: 6
            color: newHabitMouse.containsMouse ? theme.bgHover : "transparent"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 8
                anchors.rightMargin: 8
                spacing: 8

                AppIcon {
                    Layout.preferredWidth: 14
                    Layout.preferredHeight: 14
                    name: "habits"
                    color: theme.textSubtext
                }
                Text {
                    text: qsTr("Novo hábito")
                    color: theme.textDark
                    font.pixelSize: 12
                    font.family: theme.fontFamily
                    Layout.fillWidth: true
                }
            }
            MouseArea {
                id: newHabitMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    appContextMenu.close()
                    appContextMenu.actionTriggered("new_habit")
                }
            }
        }

        // Nova Transação
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 30
            radius: 6
            color: newTxMouse.containsMouse ? theme.bgHover : "transparent"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 8
                anchors.rightMargin: 8
                spacing: 8

                AppIcon {
                    Layout.preferredWidth: 14
                    Layout.preferredHeight: 14
                    name: "finance"
                    color: theme.textSubtext
                }
                Text {
                    text: qsTr("Nova transação")
                    color: theme.textDark
                    font.pixelSize: 12
                    font.family: theme.fontFamily
                    Layout.fillWidth: true
                }
            }
            MouseArea {
                id: newTxMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    appContextMenu.close()
                    appContextMenu.actionTriggered("new_transaction")
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 1
            color: theme.borderSubtle
        }

        // Paleta de Comandos
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 30
            radius: 6
            color: cmdMouse.containsMouse ? theme.bgHover : "transparent"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 8
                anchors.rightMargin: 8
                spacing: 8

                AppIcon {
                    Layout.preferredWidth: 14
                    Layout.preferredHeight: 14
                    name: "search"
                    color: theme.textSubtext
                }
                Text {
                    text: qsTr("Paleta de comandos")
                    color: theme.textDark
                    font.pixelSize: 12
                    font.family: theme.fontFamily
                    Layout.fillWidth: true
                }
                Text {
                    text: "Ctrl+K"
                    color: theme.textMuted
                    font.pixelSize: 10
                    font.family: theme.fontMono
                }
            }
            MouseArea {
                id: cmdMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    appContextMenu.close()
                    appContextMenu.actionTriggered("command_palette")
                }
            }
        }

        // Configurações
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 30
            radius: 6
            color: settingsMouse.containsMouse ? theme.bgHover : "transparent"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 8
                anchors.rightMargin: 8
                spacing: 8

                AppIcon {
                    Layout.preferredWidth: 14
                    Layout.preferredHeight: 14
                    name: "settings"
                    color: theme.textSubtext
                }
                Text {
                    text: qsTr("Configurações")
                    color: theme.textDark
                    font.pixelSize: 12
                    font.family: theme.fontFamily
                    Layout.fillWidth: true
                }
                Text {
                    text: "Ctrl+,"
                    color: theme.textMuted
                    font.pixelSize: 10
                    font.family: theme.fontMono
                }
            }
            MouseArea {
                id: settingsMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    appContextMenu.close()
                    appContextMenu.actionTriggered("settings")
                }
            }
        }
    }
}
