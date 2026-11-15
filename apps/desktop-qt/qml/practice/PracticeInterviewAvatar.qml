import QtQuick 2.15
import QtQuick.Layouts 1.15

Item {
    id: avatarRoot
    width: 140
    height: 140

    property string roleTitle: "Tutor IA"
    property bool isSpeaking: false
    property bool isListening: false

    // Outer pulsing halo
    Rectangle {
        anchors.centerIn: parent
        width: avatarRoot.isSpeaking ? 116 : 96
        height: width
        radius: width / 2
        color: "transparent"
        border.color: avatarRoot.isSpeaking ? "#8b5cf6" : (avatarRoot.isListening ? "#10b981" : "#38354d")
        border.width: 2
        opacity: avatarRoot.isSpeaking ? 0.6 : 0.2

        Behavior on width { NumberAnimation { duration: 300; easing.type: Easing.OutQuad } }
        Behavior on opacity { NumberAnimation { duration: 300 } }
    }

    // Main avatar circle
    Rectangle {
        id: coreCircle
        anchors.centerIn: parent
        width: 88
        height: 88
        radius: 44
        gradient: Gradient {
            GradientStop { position: 0.0; color: avatarRoot.isSpeaking ? "#8b5cf6" : "#6366f1" }
            GradientStop { position: 1.0; color: avatarRoot.isSpeaking ? "#4c1d95" : "#312e81" }
        }

        Text {
            anchors.centerIn: parent
            text: "🎙️"
            font.pixelSize: 34
        }
    }

    // Role badge pill at bottom
    Rectangle {
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottom: parent.bottom
        width: roleText.implicitWidth + 16
        height: 22
        radius: 11
        color: "#161524"
        border.color: avatarRoot.isSpeaking ? "#8b5cf6" : "#2e2b44"
        border.width: 1

        RowLayout {
            anchors.centerIn: parent
            spacing: 4

            Rectangle {
                width: 6
                height: 6
                radius: 3
                color: avatarRoot.isSpeaking ? "#a78bfa" : (avatarRoot.isListening ? "#34d399" : "#94a1b2")
            }

            Text {
                id: roleText
                text: avatarRoot.roleTitle
                color: "#fffffe"
                font.pixelSize: 10
                font.bold: true
            }
        }
    }
}
