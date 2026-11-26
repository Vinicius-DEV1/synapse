pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

RowLayout {
    id: actionsRoot
    property bool pointerHovered: false
    property bool colorPickerOpen: false
    property bool expanded: false
    property bool renaming: false
    property bool itemsInvalid: false

    signal manageRequested()
    signal expandToggled()
    signal renameRequested()
    signal colorPickerToggled()
    signal addRequested()
    signal deleteRequested()

    Layout.fillWidth: true
    opacity: pointerHovered || colorPickerOpen || expanded ? 1 : 0
    enabled: pointerHovered || colorPickerOpen || expanded
    Behavior on opacity { NumberAnimation { duration: 150 } }
    spacing: 2

    ToolButton {
        id: manageButton
        Layout.preferredWidth: 24
        Layout.preferredHeight: 24
        focusPolicy: Qt.NoFocus
        Accessible.name: qsTr("Gerenciar documentos agrupados")
        ToolTip.visible: hovered
        ToolTip.text: qsTr("Gerenciar documentos")
        onClicked: actionsRoot.manageRequested()
        background: Rectangle { radius: 5; color: manageButton.hovered ? "#4d000000" : "transparent" }
        contentItem: AppIcon { anchors.centerIn: parent; name: "layers"; color: manageButton.hovered ? "#fffffe" : "#a7a9be"; width: 12; height: 12 }
    }

    ToolButton {
        id: expandButton
        Layout.preferredWidth: 24
        Layout.preferredHeight: 24
        focusPolicy: Qt.NoFocus
        Accessible.name: actionsRoot.expanded ? qsTr("Recolher documentos") : qsTr("Mostrar documentos")
        ToolTip.visible: hovered
        ToolTip.text: actionsRoot.expanded ? qsTr("Recolher documentos") : qsTr("Mostrar documentos")
        onClicked: actionsRoot.expandToggled()
        background: Rectangle { radius: 5; color: expandButton.hovered ? "#4d000000" : "transparent" }
        contentItem: AppIcon {
            anchors.centerIn: parent
            name: "chevron-down"
            rotation: actionsRoot.expanded ? 180 : 0
            color: expandButton.hovered ? "#fffffe" : "#a7a9be"
            width: 12
            height: 12
        }
    }

    ToolButton {
        id: renameButton
        visible: !actionsRoot.renaming && !actionsRoot.itemsInvalid
        Layout.preferredWidth: 24
        Layout.preferredHeight: 24
        focusPolicy: Qt.NoFocus
        Accessible.name: qsTr("Renomear agrupamento")
        ToolTip.visible: hovered
        ToolTip.text: qsTr("Renomear agrupamento")
        onClicked: actionsRoot.renameRequested()
        background: Rectangle { radius: 5; color: renameButton.hovered ? "#4d000000" : "transparent" }
        contentItem: AppIcon { anchors.centerIn: parent; name: "edit"; color: renameButton.hovered ? "#fffffe" : "#a7a9be"; width: 12; height: 12 }
    }

    ToolButton {
        id: colorButton
        visible: !actionsRoot.itemsInvalid
        Layout.preferredWidth: 24
        Layout.preferredHeight: 24
        focusPolicy: Qt.NoFocus
        enabled: !actionsRoot.itemsInvalid
        Accessible.name: qsTr("Escolher cor do agrupamento")
        ToolTip.visible: hovered
        ToolTip.text: qsTr("Personalizar cor do widget")
        onClicked: actionsRoot.colorPickerToggled()
        background: Rectangle { radius: 5; color: colorButton.hovered ? "#4d000000" : "transparent" }
        contentItem: AppIcon { anchors.centerIn: parent; name: "palette"; color: colorButton.hovered ? "#fffffe" : "#a7a9be"; width: 12; height: 12 }
    }

    ToolButton {
        id: addButton
        visible: !actionsRoot.itemsInvalid
        Layout.preferredWidth: 24
        Layout.preferredHeight: 24
        focusPolicy: Qt.NoFocus
        enabled: !actionsRoot.itemsInvalid
        Accessible.name: qsTr("Adicionar documento ao agrupamento")
        ToolTip.visible: hovered
        ToolTip.text: qsTr("Adicionar item ao pacote")
        onClicked: actionsRoot.addRequested()
        background: Rectangle { radius: 5; color: addButton.hovered ? "#4d000000" : "transparent" }
        contentItem: AppIcon { anchors.centerIn: parent; name: "plus"; color: addButton.hovered ? "#fffffe" : "#a7a9be"; width: 12; height: 12 }
    }

    ToolButton {
        id: deleteButton
        Layout.preferredWidth: 24
        Layout.preferredHeight: 24
        focusPolicy: Qt.NoFocus
        Accessible.name: qsTr("Remover agrupamento")
        ToolTip.visible: hovered
        ToolTip.text: qsTr("Remover agrupamento")
        onClicked: actionsRoot.deleteRequested()
        background: Rectangle { radius: 5; color: deleteButton.hovered ? "#22ef4444" : "transparent" }
        contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: deleteButton.hovered ? "#f87171" : "#a7a9be"; width: 12; height: 12 }
    }
}
