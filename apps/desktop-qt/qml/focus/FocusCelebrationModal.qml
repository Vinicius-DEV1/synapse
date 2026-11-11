import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: modalRoot
    anchors.fill: parent
    color: "#aa000000"
    z: 95

    property int totalMinutes: 25
    property string activeTag: "Estudo"

    signal startShortBreak()
    signal startNewPomodoro()
    signal closed()

    MouseArea {
        anchors.fill: parent
        onClicked: modalRoot.closed()
    }

    Rectangle {
        width: 420; height: 320; radius: 20
        color: "#161524"
        border.color: "#5510b981"
        border.width: 1
        anchors.centerIn: parent

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 28
            spacing: 14

            Text { Layout.alignment: Qt.AlignHCenter; text: "🎉"; font.pixelSize: 48 }

            Text {
                Layout.alignment: Qt.AlignHCenter
                text: "Sessão Concluída com Sucesso!"
                color: "#fffffe"
                font.pixelSize: 18
                font.bold: true
            }

            Text {
                Layout.alignment: Qt.AlignHCenter
                text: "Você completou " + modalRoot.totalMinutes + " minutos de foco em \"" + modalRoot.activeTag + "\".\nRegistro computado no histórico do dia."
                color: "#a7a9be"
                font.pixelSize: 13
                horizontalAlignment: Text.AlignHCenter
                lineHeight: 1.4
            }

            Item { Layout.fillHeight: true }

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Rectangle {
                    Layout.fillWidth: true
                    height: 40; radius: 10
                    color: "#2610b981"
                    border.color: "#6610b981"
                    Text { anchors.centerIn: parent; text: "Pausa Curta (5m)"; color: "#34d399"; font.pixelSize: 12; font.bold: true }
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: modalRoot.startShortBreak()
                    }
                }

                Rectangle {
                    Layout.fillWidth: true
                    height: 40; radius: 10
                    color: "#8b5cf6"
                    Text { anchors.centerIn: parent; text: "Novo Pomodoro (25m)"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: modalRoot.startNewPomodoro()
                    }
                }
            }
        }
    }
}
