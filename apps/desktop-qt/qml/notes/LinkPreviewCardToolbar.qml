import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: toolbarPill
    Layout.alignment: Qt.AlignTop
    Layout.preferredHeight: 28
    Layout.preferredWidth: actionsToolbar.implicitWidth + 8
    radius: 8
    color: "#d90f0e17"
    border.color: "#14ffffff"
    border.width: 1

    property bool isYouTube: false
    property bool isWatching: false
    property bool isWatched: false
    property bool notesExpanded: false
    property bool hasNotes: false
    property bool showColorPicker: false

    signal watchYoutubeRequested()
    signal toggleWatchingRequested()
    signal toggleWatchedRequested()
    signal toggleNotesRequested()
    signal toggleColorPickerRequested()
    signal openExternalRequested()
    signal removeRequested()

    RowLayout {
        id: actionsToolbar
        anchors.centerIn: parent
        spacing: 2

        ToolButton {
            visible: toolbarPill.isYouTube
            Layout.preferredWidth: 24
            Layout.preferredHeight: 24
            focusPolicy: Qt.NoFocus
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Assistir vídeo no app")
            onClicked: toolbarPill.watchYoutubeRequested()
            background: Rectangle { radius: 6; color: parent.hovered ? "#268b5cf6" : "transparent" }
            contentItem: AppIcon { anchors.centerIn: parent; name: "play"; color: "#a78bfa"; width: 12; height: 12 }
        }

        ToolButton {
            Layout.preferredWidth: 24
            Layout.preferredHeight: 24
            focusPolicy: Qt.NoFocus
            ToolTip.visible: hovered
            ToolTip.text: toolbarPill.isWatching ? qsTr("Parar de assistir") : qsTr("Marcar como assistindo")
            onClicked: toolbarPill.toggleWatchingRequested()
            background: Rectangle {
                radius: 6
                color: toolbarPill.isWatching ? "#26f59e0b" : (parent.hovered ? "#1affffff" : "transparent")
            }
            contentItem: AppIcon {
                anchors.centerIn: parent
                name: "hourglass"
                color: toolbarPill.isWatching ? "#fbbf24" : (parent.hovered ? "#fffffe" : "#a7a9be")
                width: 12
                height: 12
            }
        }

        ToolButton {
            Layout.preferredWidth: 24
            Layout.preferredHeight: 24
            focusPolicy: Qt.NoFocus
            ToolTip.visible: hovered
            ToolTip.text: toolbarPill.isWatched ? qsTr("Desmarcar concluído") : qsTr("Marcar como concluído")
            onClicked: toolbarPill.toggleWatchedRequested()
            background: Rectangle {
                radius: 6
                color: toolbarPill.isWatched ? "#2610b981" : (parent.hovered ? "#1affffff" : "transparent")
            }
            contentItem: AppIcon {
                anchors.centerIn: parent
                name: "check"
                color: toolbarPill.isWatched ? "#34d399" : (parent.hovered ? "#fffffe" : "#a7a9be")
                width: 12
                height: 12
            }
        }

        ToolButton {
            Layout.preferredWidth: 24
            Layout.preferredHeight: 24
            focusPolicy: Qt.NoFocus
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Anotações do link")
            onClicked: toolbarPill.toggleNotesRequested()
            background: Rectangle {
                radius: 6
                color: toolbarPill.notesExpanded ? "#268b5cf6" : (parent.hovered ? "#1affffff" : "transparent")
            }
            contentItem: Item {
                AppIcon {
                    anchors.centerIn: parent
                    name: "notes"
                    color: toolbarPill.notesExpanded || toolbarPill.hasNotes ? "#c4b5fd" : "#a7a9be"
                    width: 13
                    height: 13
                }
                Rectangle {
                    visible: toolbarPill.hasNotes && !toolbarPill.notesExpanded
                    anchors.top: parent.top
                    anchors.right: parent.right
                    anchors.margins: 3
                    width: 5
                    height: 5
                    radius: 2.5
                    color: "#8b5cf6"
                }
            }
        }

        ToolButton {
            Layout.preferredWidth: 24
            Layout.preferredHeight: 24
            focusPolicy: Qt.NoFocus
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Cor do card")
            onClicked: toolbarPill.toggleColorPickerRequested()
            background: Rectangle {
                radius: 6
                color: toolbarPill.showColorPicker || parent.hovered ? "#1affffff" : "transparent"
            }
            contentItem: AppIcon {
                anchors.centerIn: parent
                name: "palette"
                color: parent.hovered ? "#fffffe" : "#a7a9be"
                width: 12
                height: 12
            }
        }

        ToolButton {
            Layout.preferredWidth: 24
            Layout.preferredHeight: 24
            focusPolicy: Qt.NoFocus
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Abrir no navegador")
            onClicked: toolbarPill.openExternalRequested()
            background: Rectangle { radius: 6; color: parent.hovered ? "#1affffff" : "transparent" }
            contentItem: AppIcon { anchors.centerIn: parent; name: "external-link"; color: parent.hovered ? "#fffffe" : "#a7a9be"; width: 12; height: 12 }
        }

        ToolButton {
            Layout.preferredWidth: 24
            Layout.preferredHeight: 24
            focusPolicy: Qt.NoFocus
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Remover card de link")
            onClicked: toolbarPill.removeRequested()
            background: Rectangle { radius: 6; color: parent.hovered ? "#22ef4444" : "transparent" }
            contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: parent.hovered ? "#fb7185" : "#a7a9be"; width: 12; height: 12 }
        }
    }
}
