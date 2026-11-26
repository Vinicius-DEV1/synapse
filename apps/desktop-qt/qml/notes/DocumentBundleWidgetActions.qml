pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

RowLayout {
    id: actionsRoot
    property alias colorAnchorItem: colorButton
    property bool pointerHovered: false
    property bool colorPickerOpen: false
    property bool expanded: false
    property bool renaming: false
    property bool itemsInvalid: false
    readonly property bool hasActionFocus: manageButton.activeFocus || expandButton.activeFocus ||
        renameButton.activeFocus || colorButton.activeFocus || addButton.activeFocus || deleteButton.activeFocus

    signal manageRequested()
    signal expandToggled()
    signal renameRequested()
    signal colorPickerToggled()
    signal addRequested()
    signal deleteRequested()

    Layout.fillWidth: true
    opacity: pointerHovered || colorPickerOpen || expanded || hasActionFocus ? 1 : 0
    Behavior on opacity { NumberAnimation { duration: 150 } }
    spacing: 2

    ToolButton {
        id: manageButton
        Layout.preferredWidth: 24
        Layout.preferredHeight: 24
        focusPolicy: Qt.TabFocus
        Accessible.name: qsTr("Gerenciar documentos agrupados")
        ToolTip.visible: hovered
        ToolTip.text: qsTr("Gerenciar documentos")
        onClicked: actionsRoot.manageRequested()
        background: Rectangle {
            radius: 5
            color: manageButton.hovered || manageButton.activeFocus ? "#4d000000" : "transparent"
            border.color: manageButton.activeFocus ? "#998b5cf6" : "transparent"
            border.width: manageButton.activeFocus ? 1 : 0
        }
        contentItem: AppIcon { anchors.centerIn: parent; name: "layers"; color: manageButton.hovered || manageButton.activeFocus ? "#fffffe" : "#a7a9be"; width: 12; height: 12 }
    }

    ToolButton {
        id: expandButton
        Layout.preferredWidth: 24
        Layout.preferredHeight: 24
        focusPolicy: Qt.TabFocus
        Accessible.name: actionsRoot.expanded ? qsTr("Recolher documentos") : qsTr("Mostrar documentos")
        ToolTip.visible: hovered
        ToolTip.text: actionsRoot.expanded ? qsTr("Recolher documentos") : qsTr("Mostrar documentos")
        onClicked: actionsRoot.expandToggled()
        background: Rectangle {
            radius: 5
            color: expandButton.hovered || expandButton.activeFocus ? "#4d000000" : "transparent"
            border.color: expandButton.activeFocus ? "#998b5cf6" : "transparent"
            border.width: expandButton.activeFocus ? 1 : 0
        }
        contentItem: AppIcon {
            anchors.centerIn: parent
            name: "chevron-down"
            rotation: actionsRoot.expanded ? 180 : 0
            color: expandButton.hovered || expandButton.activeFocus ? "#fffffe" : "#a7a9be"
            width: 12
            height: 12
        }
    }

    ToolButton {
        id: renameButton
        visible: !actionsRoot.renaming && !actionsRoot.itemsInvalid
        Layout.preferredWidth: 24
        Layout.preferredHeight: 24
        focusPolicy: Qt.TabFocus
        Accessible.name: qsTr("Renomear agrupamento")
        ToolTip.visible: hovered
        ToolTip.text: qsTr("Renomear agrupamento")
        onClicked: actionsRoot.renameRequested()
        background: Rectangle {
            radius: 5
            color: renameButton.hovered || renameButton.activeFocus ? "#4d000000" : "transparent"
            border.color: renameButton.activeFocus ? "#998b5cf6" : "transparent"
            border.width: renameButton.activeFocus ? 1 : 0
        }
        contentItem: AppIcon { anchors.centerIn: parent; name: "edit"; color: renameButton.hovered || renameButton.activeFocus ? "#fffffe" : "#a7a9be"; width: 12; height: 12 }
    }

    ToolButton {
        id: colorButton
        visible: !actionsRoot.itemsInvalid
        Layout.preferredWidth: 24
        Layout.preferredHeight: 24
        focusPolicy: Qt.TabFocus
        enabled: !actionsRoot.itemsInvalid
        Accessible.name: qsTr("Escolher cor do agrupamento")
        ToolTip.visible: hovered
        ToolTip.text: qsTr("Personalizar cor do widget")
        onClicked: actionsRoot.colorPickerToggled()
        background: Rectangle {
            radius: 5
            color: colorButton.hovered || colorButton.activeFocus ? "#4d000000" : "transparent"
            border.color: colorButton.activeFocus ? "#998b5cf6" : "transparent"
            border.width: colorButton.activeFocus ? 1 : 0
        }
        contentItem: AppIcon { anchors.centerIn: parent; name: "palette"; color: colorButton.hovered || colorButton.activeFocus ? "#fffffe" : "#a7a9be"; width: 12; height: 12 }
    }

    ToolButton {
        id: addButton
        visible: !actionsRoot.itemsInvalid
        Layout.preferredWidth: 24
        Layout.preferredHeight: 24
        focusPolicy: Qt.TabFocus
        enabled: !actionsRoot.itemsInvalid
        Accessible.name: qsTr("Adicionar documento ao agrupamento")
        ToolTip.visible: hovered
        ToolTip.text: qsTr("Adicionar item ao pacote")
        onClicked: actionsRoot.addRequested()
        background: Rectangle {
            radius: 5
            color: addButton.hovered || addButton.activeFocus ? "#4d000000" : "transparent"
            border.color: addButton.activeFocus ? "#998b5cf6" : "transparent"
            border.width: addButton.activeFocus ? 1 : 0
        }
        contentItem: AppIcon { anchors.centerIn: parent; name: "plus"; color: addButton.hovered || addButton.activeFocus ? "#fffffe" : "#a7a9be"; width: 12; height: 12 }
    }

    ToolButton {
        id: deleteButton
        Layout.preferredWidth: 24
        Layout.preferredHeight: 24
        focusPolicy: Qt.TabFocus
        Accessible.name: qsTr("Remover agrupamento")
        ToolTip.visible: hovered
        ToolTip.text: qsTr("Remover agrupamento")
        onClicked: actionsRoot.deleteRequested()
        background: Rectangle {
            radius: 5
            color: deleteButton.hovered || deleteButton.activeFocus ? "#22ef4444" : "transparent"
            border.color: deleteButton.activeFocus ? "#99fda4af" : "transparent"
            border.width: deleteButton.activeFocus ? 1 : 0
        }
        contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: deleteButton.hovered || deleteButton.activeFocus ? "#f87171" : "#a7a9be"; width: 12; height: 12 }
    }
}
