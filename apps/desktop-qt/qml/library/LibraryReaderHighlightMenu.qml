import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: root
    width: 260
    height: 44
    radius: 10
    color: "#181724"
    border.color: "#30ffffff"
    border.width: 1
    visible: false
    z: 160

    property string selectedText: ""
    property string activeColor: "yellow"

    signal highlightRequested(string color)
    signal dictionaryRequested(string text)
    signal copyRequested(string text)

    readonly property var colors: [
        { id: "yellow", hex: "#facc15" },
        { id: "green",  hex: "#4ade80" },
        { id: "blue",   hex: "#60a5fa" },
        { id: "purple", hex: "#c084fc" },
        { id: "pink",   hex: "#f472b6" }
    ]

    function openAt(x, y, text) {
        selectedText = text ? text.trim() : ""
        root.x = Math.max(16, Math.min(parent.width - root.width - 16, x))
        root.y = Math.max(16, Math.min(parent.height - root.height - 16, y - root.height - 8))
        root.visible = selectedText.length > 0
    }

    RowLayout {
        anchors.fill: parent
        anchors.margins: 6
        spacing: 6

        // Colors
        Repeater {
            model: root.colors
            delegate: Rectangle {
                width: 24
                height: 24
                radius: 12
                color: modelData.hex
                border.color: root.activeColor === modelData.id ? "#ffffff" : "transparent"
                border.width: root.activeColor === modelData.id ? 2 : 0

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: {
                        root.activeColor = modelData.id
                        root.highlightRequested(modelData.id)
                        root.visible = false
                    }
                }
            }
        }

        Rectangle { width: 1; height: 20; color: "#25ffffff" }

        // Dictionary lookup button
        Rectangle {
            width: 28; height: 28; radius: 6
            color: "#2038bdf8"
            Text { anchors.centerIn: parent; text: "📖"; font.pixelSize: 13 }
            ToolTip.visible: dictMouse.containsMouse
            ToolTip.text: "Dicionário"
            MouseArea {
                id: dictMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    root.dictionaryRequested(root.selectedText)
                    root.visible = false
                }
            }
        }

        // Copy button
        Rectangle {
            width: 28; height: 28; radius: 6
            color: "#18ffffff"
            Text { anchors.centerIn: parent; text: "📋"; font.pixelSize: 13 }
            ToolTip.visible: copyMouse.containsMouse
            ToolTip.text: "Copiar"
            MouseArea {
                id: copyMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: {
                    root.copyRequested(root.selectedText)
                    root.visible = false
                }
            }
        }
    }
}
