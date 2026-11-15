pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: paletteRoot
    objectName: "notesTableCellBackgroundPalette"
    visible: active
    property bool active: false
    property string backgroundScope: "cell"
    property bool selectionAvailable: false

    signal colorSelected(string color, string scope)

    readonly property var baseScopes: [
        { label: qsTr("Cell"), value: "cell" },
        { label: qsTr("Row"), value: "row" },
        { label: qsTr("Column"), value: "column" },
        { label: qsTr("Table"), value: "table" }
    ]
    readonly property var scopes: selectionAvailable
        ? baseScopes.concat([{ label: qsTr("Selection"), value: "selection" }])
        : baseScopes

    readonly property var colors: [
        { label: qsTr("Clear"), value: "", previewColor: "#151420" },
        { label: qsTr("Red"), value: "rgba(239, 68, 68, 0.2)", previewColor: "#33ef4444" },
        { label: qsTr("Orange"), value: "rgba(249, 115, 22, 0.2)", previewColor: "#33f97316" },
        { label: qsTr("Yellow"), value: "rgba(234, 179, 8, 0.2)", previewColor: "#33eab308" },
        { label: qsTr("Green"), value: "rgba(34, 197, 94, 0.2)", previewColor: "#3322c55e" },
        { label: qsTr("Blue"), value: "rgba(59, 130, 246, 0.2)", previewColor: "#333b82f6" },
        { label: qsTr("Purple"), value: "rgba(139, 92, 246, 0.2)", previewColor: "#338b5cf6" },
        { label: qsTr("Pink"), value: "rgba(236, 72, 153, 0.2)", previewColor: "#33ec4899" }
    ]

    function scopeDescription(scope) {
        if (scope === "selection") return qsTr("selected cells")
        if (scope === "row") return qsTr("current row")
        if (scope === "column") return qsTr("current column")
        if (scope === "table") return qsTr("entire table")
        return qsTr("active cell")
    }

    function colorDescription(colorLabel) {
        if (colorLabel === qsTr("Clear"))
            return qsTr("Clear background on %1").arg(scopeDescription(backgroundScope))
        return qsTr("Apply %1 background to %2").arg(colorLabel.toLowerCase()).arg(scopeDescription(backgroundScope))
    }

    function selectBackgroundScope(scope) {
        if (scope !== "cell" && scope !== "row" && scope !== "column" &&
                scope !== "table" && scope !== "selection") return false
        if (scope === "selection" && !selectionAvailable) return false
        backgroundScope = scope
        return true
    }

    onSelectionAvailableChanged: {
        if (!selectionAvailable && backgroundScope === "selection") backgroundScope = "cell"
    }

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

            Text {
                Layout.columnSpan: 4
                text: qsTr("Apply to")
                color: "#a7a9be"
                font.pixelSize: 10
                font.weight: Font.Medium
            }

            Repeater {
                model: paletteRoot.scopes
                delegate: ToolButton {
                    id: scopeButton
                    required property var modelData
                    objectName: "notesTableBackgroundScope_" + modelData.value
                    Layout.preferredWidth: 48
                    Layout.preferredHeight: 24
                    text: modelData.label
                    checkable: true
                    checked: paletteRoot.backgroundScope === modelData.value
                    Accessible.name: qsTr("Apply background to %1").arg(modelData.label.toLowerCase())
                    onClicked: paletteRoot.selectBackgroundScope(modelData.value)
                    background: Rectangle {
                        radius: 5
                        color: scopeButton.checked ? "#268b5cf6" : (scopeButton.hovered ? "#12ffffff" : "transparent")
                        border.color: scopeButton.checked ? "#408b5cf6" : "#12ffffff"
                    }
                    contentItem: Text {
                        text: scopeButton.text
                        color: scopeButton.checked ? "#ddd6fe" : "#c4c4d4"
                        font.pixelSize: 10
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
            }

            Repeater {
                model: paletteRoot.colors
                delegate: ToolButton {
                    id: colorButton
                    required property var modelData
                    Layout.preferredWidth: 30
                    Layout.preferredHeight: 30
                    Accessible.name: paletteRoot.colorDescription(modelData.label)
                    ToolTip.visible: hovered
                    ToolTip.text: paletteRoot.colorDescription(modelData.label)
                    onClicked: {
                        paletteRoot.colorSelected(modelData.value, paletteRoot.backgroundScope)
                        colorPopup.close()
                    }
                    background: Rectangle {
                        radius: 5
                        color: colorButton.modelData.previewColor || "#151420"
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
