import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: promptRoot
    anchors.fill: parent
    z: 60
    color: "#b3000000"

    property double savedProgress: 0

    signal restartRequested()
    signal resumeRequested()

    function formatTime(seconds) {
        var total = Math.max(0, Math.floor(seconds))
        var minutes = Math.floor(total / 60)
        var remainder = total % 60
        var hours = Math.floor(minutes / 60)
        minutes %= 60
        if (hours > 0)
            return hours + ":" + (minutes < 10 ? "0" : "") + minutes + ":" +
                   (remainder < 10 ? "0" : "") + remainder
        return (minutes < 10 ? "0" : "") + minutes + ":" +
               (remainder < 10 ? "0" : "") + remainder
    }

    MouseArea {
        anchors.fill: parent
        onClicked: function(mouse) { mouse.accepted = true }
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(promptRoot.width - 32, 384)
        height: 226
        radius: 18
        color: "#181722"
        border.color: "#18ffffff"

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 10

            Text {
                Layout.alignment: Qt.AlignHCenter
                text: "⏱️"
                font.pixelSize: 34
            }

            Text {
                Layout.fillWidth: true
                text: "Continuar assistindo?"
                color: "#fffffe"
                font.pixelSize: 20
                font.weight: Font.DemiBold
                horizontalAlignment: Text.AlignHCenter
            }

            Text {
                Layout.fillWidth: true
                text: "Você parou em " + promptRoot.formatTime(promptRoot.savedProgress)
                color: "#a7a9be"
                font.pixelSize: 14
                horizontalAlignment: Text.AlignHCenter
            }

            Item { Layout.fillHeight: true }

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Button {
                    id: restartButton
                    objectName: "restartButton"
                    Layout.fillWidth: true
                    text: "Recomeçar"
                    Accessible.name: text
                    onClicked: promptRoot.restartRequested()
                    background: Rectangle {
                        radius: 10
                        color: restartButton.down ? "#282733" : "#20202b"
                        border.color: "#18ffffff"
                    }
                    contentItem: Text {
                        text: restartButton.text
                        color: "#e4e4e7"
                        font.pixelSize: 13
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }

                Button {
                    id: resumeButton
                    objectName: "resumeButton"
                    Layout.fillWidth: true
                    text: "Continuar"
                    Accessible.name: text
                    onClicked: promptRoot.resumeRequested()
                    background: Rectangle {
                        radius: 10
                        color: resumeButton.down ? "#5145b8" : "#6366f1"
                    }
                    contentItem: Text {
                        text: resumeButton.text
                        color: "#ffffff"
                        font.pixelSize: 13
                        font.weight: Font.DemiBold
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
            }
        }
    }
}
