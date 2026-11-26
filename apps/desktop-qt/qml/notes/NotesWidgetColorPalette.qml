pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Popup {
    id: paletteRoot
    parent: Overlay.overlay
    width: 200
    height: 104
    padding: 8
    modal: false
    focus: true
    closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside

    property Item anchorItem: null
    property bool isOpen: false
    property string currentColor: "default"

    signal colorSelected(string color)
    signal dismissed()

    readonly property var colors: [
        { label: qsTr("Padrão"), value: "default" },
        { label: qsTr("Fundo Cinza"), value: "#9CA3AF" },
        { label: qsTr("Fundo Marrom"), value: "#A8A29E" },
        { label: qsTr("Fundo Laranja"), value: "#F97316" },
        { label: qsTr("Fundo Amarelo"), value: "#EAB308" },
        { label: qsTr("Fundo Verde"), value: "#22C55E" },
        { label: qsTr("Fundo Azul"), value: "#3B82F6" },
        { label: qsTr("Fundo Roxo"), value: "#A855F7" },
        { label: qsTr("Fundo Rosa"), value: "#EC4899" },
        { label: qsTr("Fundo Vermelho"), value: "#EF4444" }
    ]

    function updatePosition() {
        if (!paletteRoot.parent || !paletteRoot.anchorItem) return
        var overlay = paletteRoot.parent
        var anchorBottomRight = paletteRoot.anchorItem.mapToItem(
            overlay, paletteRoot.anchorItem.width, paletteRoot.anchorItem.height)
        var anchorTopRight = paletteRoot.anchorItem.mapToItem(
            overlay, paletteRoot.anchorItem.width, 0)
        var margin = 12
        var gap = 6
        var maxX = Math.max(margin, overlay.width - paletteRoot.width - margin)
        paletteRoot.x = Math.max(margin, Math.min(anchorBottomRight.x - paletteRoot.width, maxX))

        var belowY = anchorBottomRight.y + gap
        var aboveY = anchorTopRight.y - paletteRoot.height - gap
        var maxY = Math.max(margin, overlay.height - paletteRoot.height - margin)
        var preferredY = belowY + paletteRoot.height <= overlay.height - margin ? belowY : aboveY
        paletteRoot.y = Math.max(margin, Math.min(preferredY, maxY))
    }

    function selectColor(value) {
        paletteRoot.colorSelected(value)
        paletteRoot.close()
    }

    function isSelectedColor(value) {
        return paletteRoot.currentColor === value || (value === "default" && !paletteRoot.currentColor)
    }

    onIsOpenChanged: {
        if (isOpen) open()
        else close()
    }
    onOpened: updatePosition()
    onClosed: dismissed()

    Connections {
        target: paletteRoot.anchorItem
        ignoreUnknownSignals: true
        function onXChanged() { if (paletteRoot.opened) paletteRoot.updatePosition() }
        function onYChanged() { if (paletteRoot.opened) paletteRoot.updatePosition() }
        function onWidthChanged() { if (paletteRoot.opened) paletteRoot.updatePosition() }
        function onHeightChanged() { if (paletteRoot.opened) paletteRoot.updatePosition() }
    }

    Connections {
        target: paletteRoot.parent
        ignoreUnknownSignals: true
        function onWidthChanged() { if (paletteRoot.opened) paletteRoot.updatePosition() }
        function onHeightChanged() { if (paletteRoot.opened) paletteRoot.updatePosition() }
    }

    Timer {
        interval: 40
        repeat: true
        running: paletteRoot.opened
        onTriggered: paletteRoot.updatePosition()
    }

    background: Rectangle {
        color: "#f21f1f28"
        radius: 12
        border.color: "#22ffffff"
        border.width: 1
    }

    contentItem: ColumnLayout {
        spacing: 8

        Text {
            Layout.fillWidth: true
            text: qsTr("Cor do Destaque")
            color: "#a7a9be"
            font.pixelSize: 11
            font.weight: Font.Medium
        }

        GridLayout {
            Layout.alignment: Qt.AlignHCenter
            columns: 5
            rowSpacing: 6
            columnSpacing: 6

            Repeater {
                model: paletteRoot.colors
                delegate: ToolButton {
                    id: colorButton
                    required property var modelData
                    readonly property bool isSelected: paletteRoot.isSelectedColor(colorButton.modelData.value)
                    Layout.preferredWidth: 28
                    Layout.preferredHeight: 28
                    scale: hovered ? 1.1 : (isSelected ? 1.05 : 1)
                    Behavior on scale { NumberAnimation { duration: 100 } }
                    Accessible.name: colorButton.modelData.label
                    ToolTip.visible: hovered
                    ToolTip.text: colorButton.modelData.label
                    onClicked: paletteRoot.selectColor(colorButton.modelData.value)

                    background: Rectangle {
                        radius: 8
                        color: colorButton.modelData.value === "default"
                            ? (colorButton.isSelected ? "#3b3a42" : "#262533")
                            : colorButton.modelData.value
                        border.width: colorButton.isSelected ? 2 : 1
                        border.color: colorButton.isSelected ? "#fffffe"
                            : (colorButton.hovered ? "#4dffffff" : "#26ffffff")
                    }

                    contentItem: Text {
                        text: colorButton.modelData.value === "default" ? "×" : ""
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
