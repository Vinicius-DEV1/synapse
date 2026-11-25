import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

ColumnLayout {
    id: colorPicker

    property string selectedColor: "default"
    readonly property var colors: [
        { name: qsTr("Cinza"), hex: "#9CA3AF", picker: colorPicker },
        { name: qsTr("Marrom"), hex: "#A8A29E", picker: colorPicker },
        { name: qsTr("Laranja"), hex: "#F97316", picker: colorPicker },
        { name: qsTr("Amarelo"), hex: "#EAB308", picker: colorPicker },
        { name: qsTr("Verde"), hex: "#22C55E", picker: colorPicker },
        { name: qsTr("Azul"), hex: "#3B82F6", picker: colorPicker },
        { name: qsTr("Roxo"), hex: "#A855F7", picker: colorPicker },
        { name: qsTr("Rosa"), hex: "#EC4899", picker: colorPicker },
        { name: qsTr("Vermelho"), hex: "#EF4444", picker: colorPicker }
    ]

    signal colorSelected(string color)

    spacing: 4

    Text {
        text: qsTr("Cor do Widget")
        color: "#a7a9be"
        font.pixelSize: 9
        font.capitalization: Font.AllUppercase
    }

    GridLayout {
        Layout.fillWidth: true
        columns: 5
        columnSpacing: 5
        rowSpacing: 5

        ToolButton {
            Layout.preferredWidth: 22
            Layout.preferredHeight: 20
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Padrão")
            onClicked: colorPicker.colorSelected("default")
            background: Rectangle {
                radius: 4
                color: colorPicker.selectedColor === "default" ? "#33ffffff" : "transparent"
                border.color: colorPicker.selectedColor === "default" ? "#ffffff" : "#33ffffff"
            }
            contentItem: AppIcon {
                anchors.centerIn: parent
                name: "close"
                color: "#a7a9be"
                width: 10
                height: 10
            }
        }

        Repeater {
            model: colorPicker.colors
            delegate: ToolButton {
                id: colorOption
                required property var modelData
                Layout.preferredWidth: 22
                Layout.preferredHeight: 20
                ToolTip.visible: hovered
                ToolTip.text: colorOption.modelData.name
                onClicked: colorOption.modelData.picker.colorSelected(colorOption.modelData.hex)
                background: Rectangle {
                    radius: 4
                    color: colorOption.modelData.hex
                    border.color: colorOption.modelData.picker.selectedColor.toLowerCase() === colorOption.modelData.hex.toLowerCase()
                        ? "#ffffff" : "#33ffffff"
                    border.width: colorOption.modelData.picker.selectedColor.toLowerCase() === colorOption.modelData.hex.toLowerCase() ? 2 : 1
                }
            }
        }
    }
}
