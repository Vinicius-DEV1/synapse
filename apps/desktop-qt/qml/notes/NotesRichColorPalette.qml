pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: paletteRoot
    objectName: "notesRichColorPalette"
    visible: richMode
    property bool richMode: false

    signal colorSelected(bool background, string color)

    readonly property var textColors: [
        { label: qsTr("Default text color"), value: "" },
        { label: qsTr("Gray"), value: "#9CA3AF" },
        { label: qsTr("Brown"), value: "#A8A29E" },
        { label: qsTr("Orange"), value: "#F97316" },
        { label: qsTr("Yellow"), value: "#EAB308" },
        { label: qsTr("Green"), value: "#22C55E" },
        { label: qsTr("Blue"), value: "#3B82F6" },
        { label: qsTr("Purple"), value: "#A855F7" },
        { label: qsTr("Pink"), value: "#EC4899" },
        { label: qsTr("Red"), value: "#EF4444" }
    ]
    readonly property var highlightColors: [
        { label: qsTr("Clear highlight"), value: "" },
        { label: qsTr("Gray highlight"), value: "#9CA3AF" },
        { label: qsTr("Brown highlight"), value: "#A8A29E" },
        { label: qsTr("Orange highlight"), value: "#F97316" },
        { label: qsTr("Yellow highlight"), value: "#EAB308" },
        { label: qsTr("Green highlight"), value: "#22C55E" },
        { label: qsTr("Blue highlight"), value: "#3B82F6" },
        { label: qsTr("Purple highlight"), value: "#A855F7" },
        { label: qsTr("Pink highlight"), value: "#EC4899" },
        { label: qsTr("Red highlight"), value: "#EF4444" }
    ]

    ToolButton {
        id: paletteButton
        anchors.fill: parent
        text: "A"
        Accessible.name: qsTr("Text color and highlight")
        ToolTip.visible: hovered
        ToolTip.text: qsTr("Text color and highlight")
        onClicked: colorPopup.open()
        background: Rectangle { radius: 6; color: paletteButton.hovered ? "#1f8b5cf6" : "#08ffffff" }
        contentItem: Text {
            text: paletteButton.text
            color: "#c4b5fd"
            font.pixelSize: 13
            font.bold: true
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
        }
    }

    Popup {
        id: colorPopup
        x: (paletteRoot.width - width) / 2
        y: -height - 8
        width: 232
        padding: 10
        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside

        background: Rectangle {
            color: "#1a1924"
            radius: 10
            border.color: "#18ffffff"
        }

        contentItem: ColumnLayout {
            spacing: 8

            Text { text: qsTr("Text color"); color: "#a7a9be"; font.pixelSize: 10; font.bold: true }
            GridLayout {
                columns: 5
                rowSpacing: 3
                columnSpacing: 3
                Repeater {
                    model: paletteRoot.textColors
                    delegate: ToolButton {
                        id: textColorSwatch
                        required property var modelData
                        Layout.preferredWidth: 34
                        Layout.preferredHeight: 30
                        Accessible.name: modelData.label
                        ToolTip.visible: hovered
                        ToolTip.text: modelData.label
                        onClicked: {
                            paletteRoot.colorSelected(false, modelData.value)
                            colorPopup.close()
                        }
                        background: Rectangle {
                            radius: 6
                            color: textColorSwatch.modelData.value.length > 0 ? textColorSwatch.modelData.value : "#262533"
                            border.color: "#2affffff"
                        }
                        contentItem: Text {
                            text: textColorSwatch.modelData.value.length > 0 ? "" : "A"
                            color: "#fffffe"
                            font.pixelSize: 12
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                    }
                }
            }

            Rectangle { Layout.fillWidth: true; Layout.preferredHeight: 1; color: "#14ffffff" }

            Text { text: qsTr("Highlight"); color: "#a7a9be"; font.pixelSize: 10; font.bold: true }
            GridLayout {
                columns: 5
                rowSpacing: 3
                columnSpacing: 3
                Repeater {
                    model: paletteRoot.highlightColors
                    delegate: ToolButton {
                        id: highlightColorSwatch
                        required property var modelData
                        Layout.preferredWidth: 34
                        Layout.preferredHeight: 30
                        Accessible.name: modelData.label
                        ToolTip.visible: hovered
                        ToolTip.text: modelData.label
                        onClicked: {
                            paletteRoot.colorSelected(true, modelData.value)
                            colorPopup.close()
                        }
                        background: Rectangle {
                            radius: 6
                            color: highlightColorSwatch.modelData.value.length > 0 ? highlightColorSwatch.modelData.value : "#262533"
                            border.color: "#2affffff"
                        }
                        contentItem: Text {
                            text: highlightColorSwatch.modelData.value.length > 0 ? "" : "×"
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
}
