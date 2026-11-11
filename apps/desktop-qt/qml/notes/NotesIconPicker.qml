import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: iconPicker
    implicitWidth: 64
    implicitHeight: 64
    Layout.preferredWidth: 64
    Layout.preferredHeight: 64

    property string activeIcon: "📄"
    readonly property bool isOpen: emojiPopup.opened

    signal iconSelected(string icon)

    Rectangle {
        id: emojiButton
        width: 64
        height: 64
        radius: 12
        color: emojiPopup.opened ? "#1a8b5cf6" : (emojiMouse.containsMouse ? "#0dffffff" : "transparent")
        border.color: emojiPopup.opened ? "#668b5cf6" : (emojiMouse.containsMouse ? "#12ffffff" : "transparent")
        border.width: 1

        Text {
            anchors.centerIn: parent
            text: iconPicker.activeIcon
            font.pixelSize: 48
        }

        MouseArea {
            id: emojiMouse
            anchors.fill: parent
            hoverEnabled: true
            cursorShape: Qt.PointingHandCursor
            onClicked: emojiPopup.opened ? emojiPopup.close() : emojiPopup.open()
        }
    }

    Popup {
        id: emojiPopup
        x: 0
        y: emojiButton.height + 8
        width: 292
        padding: 12
        modal: false
        focus: true
        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside

        background: Rectangle {
            color: "#161524"
            border.color: "#4d818cf8"
            radius: 12
        }

        contentItem: GridLayout {
            columns: 4
            rowSpacing: 6
            columnSpacing: 6

            Repeater {
                model: ["📄", "💡", "🚀", "📚", "💻", "🎨", "⚡", "🎯", "🔒", "⭐", "🧠", "🔥", "📊", "💰", "🎵", "📝"]

                delegate: ToolButton {
                    Layout.preferredWidth: 58
                    Layout.preferredHeight: 42
                    text: modelData
                    font.pixelSize: 20
                    onClicked: {
                        iconPicker.iconSelected(modelData)
                        emojiPopup.close()
                    }
                    background: Rectangle {
                        color: parent.hovered ? "#18ffffff" : "#1a1924"
                        border.color: "#0affffff"
                        radius: 8
                    }
                }
            }
        }
    }
}
