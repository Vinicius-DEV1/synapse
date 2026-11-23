import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Item {
    id: handleRoot
    width: 24
    height: 28

    property bool activeVisible: false
    property bool canMoveUp: true
    property bool canMoveDown: true

    signal moveUpRequested()
    signal moveDownRequested()
    signal duplicateRequested()
    signal insertBelowRequested()
    signal deleteRequested()

    ToolButton {
        anchors.fill: parent
        opacity: handleRoot.activeVisible || hovered || blockMenu.visible ? 1 : 0.18
        Behavior on opacity { NumberAnimation { duration: 120 } }
        focusPolicy: Qt.NoFocus
        ToolTip.visible: hovered
        ToolTip.text: qsTr("Ações do bloco")
        onClicked: blockMenu.open()
        background: Rectangle { radius: 6; color: parent.hovered ? "#228b5cf6" : "transparent" }
        contentItem: Text {
            text: "⋮⋮"
            color: parent.hovered ? "#c4b5fd" : "#71717a"
            font.pixelSize: 13
            font.bold: true
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
        }
    }

    Menu {
        id: blockMenu
        background: Rectangle { color: "#181726"; radius: 10; border.color: "#22ffffff" }
        MenuItem { text: qsTr("Mover para cima"); enabled: handleRoot.canMoveUp; onTriggered: handleRoot.moveUpRequested() }
        MenuItem { text: qsTr("Mover para baixo"); enabled: handleRoot.canMoveDown; onTriggered: handleRoot.moveDownRequested() }
        MenuItem { text: qsTr("Inserir texto abaixo"); onTriggered: handleRoot.insertBelowRequested() }
        MenuItem { text: qsTr("Duplicar bloco"); onTriggered: handleRoot.duplicateRequested() }
        MenuSeparator {}
        MenuItem { text: qsTr("Excluir bloco"); onTriggered: handleRoot.deleteRequested() }
    }
}
