import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Item {
    id: handleRoot
    width: 24
    height: 24

    property bool activeVisible: false
    property bool canMoveUp: true
    property bool canMoveDown: true
    readonly property bool handleHovered: handleBtn.hovered || blockMenu.visible

    signal moveUpRequested()
    signal moveDownRequested()
    signal duplicateRequested()
    signal insertBelowRequested()
    signal deleteRequested()

    ToolButton {
        id: handleBtn
        anchors.fill: parent
        opacity: handleRoot.activeVisible || hovered || blockMenu.visible ? 1 : 0
        Behavior on opacity { NumberAnimation { duration: 120 } }
        focusPolicy: Qt.NoFocus
        hoverEnabled: true
        ToolTip.visible: hovered
        ToolTip.text: qsTr("Opções do bloco")
        onClicked: blockMenu.open()
        background: Rectangle {
            radius: 6
            color: blockMenu.visible ? "#338b5cf6" : (parent.hovered ? "#1affffff" : "transparent")
            border.color: blockMenu.visible ? "#4d8b5cf6" : "transparent"
        }
        contentItem: Column {
            anchors.centerIn: parent
            spacing: 2
            Repeater {
                model: 3
                delegate: Row {
                    spacing: 2
                    Rectangle { width: 2.5; height: 2.5; radius: 1.25; color: handleBtn.hovered || blockMenu.visible ? "#fffffe" : "#71717a" }
                    Rectangle { width: 2.5; height: 2.5; radius: 1.25; color: handleBtn.hovered || blockMenu.visible ? "#fffffe" : "#71717a" }
                }
            }
        }
    }

    Menu {
        id: blockMenu
        background: Rectangle { color: "#f20f0e17"; radius: 12; border.color: "#12ffffff" }
        MenuItem { text: qsTr("Subir bloco"); enabled: handleRoot.canMoveUp; onTriggered: handleRoot.moveUpRequested() }
        MenuItem { text: qsTr("Descer bloco"); enabled: handleRoot.canMoveDown; onTriggered: handleRoot.moveDownRequested() }
        MenuItem { text: qsTr("Adicionar linha abaixo"); onTriggered: handleRoot.insertBelowRequested() }
        MenuItem { text: qsTr("Duplicar bloco"); onTriggered: handleRoot.duplicateRequested() }
        MenuSeparator {}
        MenuItem { text: qsTr("Excluir bloco"); onTriggered: handleRoot.deleteRequested() }
    }
}
