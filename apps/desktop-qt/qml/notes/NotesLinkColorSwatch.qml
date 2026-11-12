import QtQuick 2.15
import QtQuick.Controls 2.15

ToolButton {
    id: colorSwatch
    property string colorKey: "default"
    property string colorName: "Default"
    property string colorValue: "default"
    property string selectedColor: "default"
    property bool isSaving: false

    objectName: "notesLinkColorSwatch" + colorKey.charAt(0).toUpperCase() + colorKey.slice(1)
    Accessible.name: colorName
    Accessible.description: colorValue === "default" ? qsTr("Reset link card color") : colorValue
    checkable: true
    checked: selectedColor.toLowerCase() === colorValue.toLowerCase()
    enabled: !isSaving
    focusPolicy: Qt.TabFocus
    implicitWidth: 48
    implicitHeight: 48

    signal colorChosen(string color)

    onClicked: colorChosen(colorValue)

    background: Rectangle {
        radius: 10
        color: colorSwatch.colorValue === "default" ? "#12111a" : colorSwatch.colorValue
        border.width: colorSwatch.checked ? 2 : 1
        border.color: colorSwatch.checked ? "#fffffe" : "#28ffffff"
    }

    contentItem: Text {
        text: colorSwatch.colorValue === "default" ? "×" : ""
        color: "#fffffe"
        font.pixelSize: 20
        horizontalAlignment: Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
    }
}
