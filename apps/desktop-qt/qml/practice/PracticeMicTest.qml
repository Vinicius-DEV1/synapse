import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: micTestRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: false
    z: 130

    property bool isTesting: false
    property double audioLevel: 0.0

    signal closeRequested()

    Shortcut {
        sequence: "Escape"
        enabled: micTestRoot.visible
        onActivated: micTestRoot.closeRequested()
    }

    Timer {
        id: levelSimTimer
        interval: 60
        running: micTestRoot.isTesting
        repeat: true
        onTriggered: {
            micTestRoot.audioLevel = 0.1 + Math.random() * 0.8
        }
    }

    MouseArea {
        anchors.fill: parent
        onClicked: micTestRoot.closeRequested()
    }

    Rectangle {
        anchors.centerIn: parent
        width: 440
        height: 280
        radius: 16
        color: "#161524"
        border.color: "#38354d"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Text { text: "🎙️"; font.pixelSize: 20 }
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Text { text: "Teste de Microfone"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }
                    Text { text: "Verifique o nível de captação do seu dispositivo"; color: "#94a1b2"; font.pixelSize: 11 }
                }

                Button {
                    text: "✕"
                    flat: true
                    onClicked: micTestRoot.closeRequested()
                }
            }

            // Audio Level Meter Bar
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 6

                Text {
                    text: micTestRoot.isTesting ? "Fale algo para testar..." : "Clique em 'Iniciar Teste' para captar áudio"
                    color: "#d4d4d8"
                    font.pixelSize: 12
                }

                Rectangle {
                    Layout.fillWidth: true
                    height: 14
                    radius: 7
                    color: "#11101a"
                    border.color: "#2e2b44"

                    Rectangle {
                        height: parent.height
                        radius: parent.radius
                        width: micTestRoot.isTesting ? parent.width * micTestRoot.audioLevel : 0
                        color: micTestRoot.audioLevel > 0.8 ? "#f43f5e" : (micTestRoot.audioLevel > 0.5 ? "#10b981" : "#3b82f6")
                        Behavior on width { NumberAnimation { duration: 50 } }
                    }
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Button {
                    text: micTestRoot.isTesting ? "Parar Teste" : "Iniciar Teste"
                    Layout.fillWidth: true
                    background: Rectangle {
                        color: micTestRoot.isTesting ? "#f43f5e" : "#8b5cf6"
                        radius: 8
                    }
                    contentItem: Text {
                        text: parent.text
                        color: "#ffffff"
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: micTestRoot.isTesting = !micTestRoot.isTesting
                }

                Button {
                    text: "Fechar"
                    background: Rectangle { color: "#232135"; radius: 8 }
                    contentItem: Text { text: parent.text; color: "#fffffe"; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: {
                        micTestRoot.isTesting = false
                        micTestRoot.closeRequested()
                    }
                }
            }
        }
    }
}
