import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Item {
    id: iconPicker
    implicitWidth: 64
    implicitHeight: 64
    Layout.preferredWidth: 64
    Layout.preferredHeight: 64

    property string activeIcon: "📄"
    readonly property bool isOpen: emojiPopup.visible

    signal iconSelected(string icon)

    Rectangle {
        id: emojiButton
        width: 64
        height: 64
        radius: 12
        color: emojiPopup.visible ? "#1a8b5cf6" : (emojiMouse.containsMouse ? "#0dffffff" : "transparent")
        border.color: emojiPopup.visible ? "#668b5cf6" : (emojiMouse.containsMouse ? "#12ffffff" : "transparent")
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
            onClicked: emojiPopup.visible ? emojiPopup.close() : emojiPopup.open()
        }
    }

    AppEmojiPopover {
        id: emojiPopup
        x: 0
        y: emojiButton.height + 8
        onEmojiSelected: function(emoji) {
            iconPicker.iconSelected(emoji)
        }
    }
}
