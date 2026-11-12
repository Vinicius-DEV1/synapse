import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ToolButton {
    id: selectionButton
    property string scope: ""
    property string currentScope: "none"
    property string glyph: ""
    property string accessibleLabel: ""
    checkable: true
    checked: currentScope === scope
    Layout.preferredWidth: 28
    Layout.preferredHeight: 26
    padding: 2
    text: glyph
    Accessible.name: accessibleLabel
    ToolTip.visible: hovered
    ToolTip.text: accessibleLabel
    background: Rectangle {
        radius: 4
        color: selectionButton.checked ? "#268b5cf6" :
            (selectionButton.hovered ? "#1affffff" : "#08ffffff")
        border.color: selectionButton.checked ? "#408b5cf6" : "transparent"
    }
    contentItem: Text {
        text: selectionButton.text
        color: selectionButton.checked ? "#c4b5fd" : "#a7a9be"
        font.pixelSize: 13
        horizontalAlignment: Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
    }
    signal selectionRequested(string scope)
    onClicked: selectionButton.selectionRequested(selectionButton.scope)
}
