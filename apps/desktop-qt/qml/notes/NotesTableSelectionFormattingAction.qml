pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15

ToolButton {
    id: actionRoot
    objectName: "notesClearTableSelectionFormatting"
    property bool selectionAvailable: false
    visible: selectionAvailable
    text: "Tx"
    Accessible.name: qsTr("Clear formatting in selected cells")
    ToolTip.visible: hovered
    ToolTip.text: Accessible.name
    background: Rectangle {
        radius: 6
        color: actionRoot.hovered ? "#1f8b5cf6" : "#08ffffff"
    }
    contentItem: Text {
        text: actionRoot.text
        color: "#c4b5fd"
        font.pixelSize: 12
        horizontalAlignment: Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
    }
    signal clearRequested()
    onClicked: clearRequested()
}
