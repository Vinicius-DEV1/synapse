pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: paletteRoot
    objectName: "notesTableCellBackgroundPalette"
    visible: active
    property bool active: false

    signal colorSelected(string color)

    readonly property var colors: [
        { label: qsTr("Clear cell background"), value: "" },
        { label: qsTr("Red cell background"), value: "rgba(239, 68, 68, 0.2)" },
        { label: qsTr("Orange cell background"), value: "rgba(249, 115, 22, 0.2)" },
        { label: qsTr("Yellow cell background"), value: "rgba(234, 179, 8, 0.2)" },
        { label: qsTr("Green cell background"), value: "rgba(34, 197, 94, 0.2)" },
        { label: qsTr("Blue cell background"), value: "rgba(59, 130, 246, 0.2)" },
        { label: qsTr("Purple cell background"), value: "rgba(139, 92, 246, 0.2)" },
        { label: qsTr("Pink cell background"), value: "rgba(236, 72, 153, 0.2)" }
    ]

    ToolButton {
        id: paletteButton
        anchors.fill: parent
        text: "▧"
        Accessible.name: qsTr("Cell background color")
        ToolTip.visible: hovered
        ToolTip.text: qsTr("Cell background color")
        onClicked: colorPopup.open()
        background: Rectangle { radius: 6; color: paletteButton.hovered ? "#1f8b5cf6" : "#08ffffff" }
        contentItem: Text {
            text: paletteButton.text
            color: "#c4b5fd"
            font.pixelSize: 15
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
        }
    }

    Popup {
        id: colorPopup
        y: paletteButton.height + 4
        padding: 8
        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
        background: Rectangle { radius: 8; color: "#211f30"; border.color: "#26ffffff" }

        GridLayout {
            columns: 4
            rowSpacing: 6
            columnSpacing: 6

            Repeater {
                model: paletteRoot.colors
                delegate: ToolButton {
                    id: colorButton
                    required property var modelData
                    Layout.preferredWidth: 30
                    Layout.preferredHeight: 30
                    Accessible.name: modelData.label
                    ToolTip.visible: hovered
                    ToolTip.text: modelData.label
                    onClicked: {
                        paletteRoot.colorSelected(modelData.value)
                        colorPopup.close()
                    }
                    background: Rectangle {
                        radius: 5
                        color: colorButton.modelData.value.length > 0 ? colorButton.modelData.value : "#151420"
                        border.color: "#40ffffff"
                        Text {
                            anchors.centerIn: parent
                            visible: colorButton.modelData.value.length === 0
                            text: "×"
                            color: "#d4d4dc"
                            font.pixelSize: 17
                        }
                    }
                }
            }
        }
    }
}
