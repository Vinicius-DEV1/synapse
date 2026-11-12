import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

pragma ComponentBehavior: Bound

Item {
    id: paletteRoot
    objectName: "notesCalloutPalette"
    visible: active
    property bool active: false
    property string currentColor: "default"
    signal colorSelected(string color)

    readonly property var colors: [
        { label: qsTr("Gray callout"), value: "#9CA3AF" },
        { label: qsTr("Brown callout"), value: "#A8A29E" },
        { label: qsTr("Orange callout"), value: "#F97316" },
        { label: qsTr("Yellow callout"), value: "#EAB308" },
        { label: qsTr("Green callout"), value: "#22C55E" },
        { label: qsTr("Blue callout"), value: "#3B82F6" },
        { label: qsTr("Purple callout"), value: "#A855F7" },
        { label: qsTr("Pink callout"), value: "#EC4899" },
        { label: qsTr("Red callout"), value: "#EF4444" },
        { label: qsTr("Default callout"), value: "default" }
    ]

    ToolButton {
        id: paletteButton
        anchors.fill: parent
        objectName: "notesCalloutPaletteButton"
        text: "▰"
        Accessible.name: qsTr("Callout color")
        ToolTip.visible: hovered
        ToolTip.text: qsTr("Callout color")
        onClicked: colorPopup.open()
        background: Rectangle {
            radius: 6
            color: paletteButton.hovered ? "#1f8b5cf6" : "#08ffffff"
        }
        contentItem: Text {
            text: paletteButton.text
            color: paletteRoot.currentColor === "default" ? "#c4b5fd" : paletteRoot.currentColor
            font.pixelSize: 14
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
        }
    }

    Popup {
        id: colorPopup
        x: (paletteRoot.width - width) / 2
        y: -height - 8
        padding: 8
        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside

        background: Rectangle {
            color: "#1a1924"
            radius: 10
            border.color: "#18ffffff"
        }

        contentItem: RowLayout {
            spacing: 4

            Repeater {
                model: paletteRoot.colors
                delegate: ToolButton {
                    id: colorSwatch
                    required property var modelData
                    Layout.preferredWidth: 20
                    Layout.preferredHeight: 20
                    Accessible.name: colorSwatch.modelData.label
                    ToolTip.visible: hovered
                    ToolTip.text: colorSwatch.modelData.label
                    onClicked: {
                        paletteRoot.colorSelected(colorSwatch.modelData.value)
                        colorPopup.close()
                    }
                    background: Rectangle {
                        radius: height / 2
                        color: colorSwatch.modelData.value === "default"
                            ? "#262533" : colorSwatch.modelData.value
                        border.width: paletteRoot.currentColor === colorSwatch.modelData.value ? 2 : 1
                        border.color: paletteRoot.currentColor === colorSwatch.modelData.value
                            ? "#fffffe" : "#2affffff"
                    }
                    contentItem: Text {
                        text: colorSwatch.modelData.value === "default" ? "×" : ""
                        color: "#fffffe"
                        font.pixelSize: 15
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
            }
        }
    }
}
