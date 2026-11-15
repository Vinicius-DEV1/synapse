import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: headerRoot
    height: 60
    color: "#161524"
    border.color: "#232135"
    border.width: 1

    property string title: "Simulado Sequencial"
    property int currentIndex: 0
    property int totalQuestions: 1
    property int timeElapsedSeconds: 0

    signal exitRequested()

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 24
        anchors.rightMargin: 24
        spacing: 16

        // Title and badge
        RowLayout {
            spacing: 10
            Rectangle {
                width: 10
                height: 10
                radius: 5
                color: "#10b981"
            }
            Text {
                text: headerRoot.title
                color: "#fffffe"
                font.pixelSize: 15
                font.bold: true
                elide: Text.ElideRight
                Layout.maximumWidth: 300
            }
        }

        // Center: Progress indicator
        ColumnLayout {
            Layout.fillWidth: true
            Layout.alignment: Qt.AlignHCenter
            spacing: 4

            RowLayout {
                Layout.alignment: Qt.AlignHCenter
                spacing: 8
                Text {
                    text: "Questão " + (headerRoot.currentIndex + 1) + " de " + Math.max(1, headerRoot.totalQuestions)
                    color: "#94a1b2"
                    font.pixelSize: 12
                    font.bold: true
                }
            }

            Rectangle {
                Layout.fillWidth: true
                Layout.maximumWidth: 400
                height: 6
                radius: 3
                color: "#232135"

                Rectangle {
                    height: parent.height
                    radius: parent.radius
                    color: "#8b5cf6"
                    width: parent.width * Math.min(1.0, Math.max(0.0, (headerRoot.currentIndex + 1) / Math.max(1, headerRoot.totalQuestions)))
                    Behavior on width { NumberAnimation { duration: 200 } }
                }
            }
        }

        // Timer
        Rectangle {
            width: 80
            height: 32
            radius: 8
            color: "#1f1d2e"
            Text {
                anchors.centerIn: parent
                text: {
                    var m = Math.floor(headerRoot.timeElapsedSeconds / 60)
                    var s = headerRoot.timeElapsedSeconds % 60
                    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s
                }
                color: "#fffffe"
                font.family: "Monospace"
                font.pixelSize: 13
                font.bold: true
            }
        }

        // Exit button
        Button {
            text: "Sair (Esc)"
            background: Rectangle {
                color: "#232135"
                radius: 8
            }
            contentItem: Text {
                text: parent.text
                color: "#94a1b2"
                font.pixelSize: 12
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            onClicked: headerRoot.exitRequested()
        }
    }
}
