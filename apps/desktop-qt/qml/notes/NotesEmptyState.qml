import QtQuick 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: emptyState
    Layout.fillWidth: true
    Layout.fillHeight: true
    color: theme.bgDarkBg

    signal createRequested()

    ColumnLayout {
        anchors.centerIn: parent
        spacing: 14

        Rectangle {
            Layout.alignment: Qt.AlignHCenter
            width: 64
            height: 64
            radius: 32
            color: "#1a8b5cf6"
            border.color: "#338b5cf6"

            Text {
                anchors.centerIn: parent
                text: "📄"
                font.pixelSize: 26
            }
        }

        Text {
            Layout.alignment: Qt.AlignHCenter
            text: "Seu caderno está vazio"
            color: "#ffffff"
            font.pixelSize: 20
            font.bold: true
            font.family: theme.fontFamily
        }

        Text {
            Layout.alignment: Qt.AlignHCenter
            text: "Crie uma nova página para começar a fazer suas anotações e organizar suas ideias."
            color: theme.textSubtext
            font.pixelSize: 13
            font.family: theme.fontFamily
        }

        Rectangle {
            Layout.alignment: Qt.AlignHCenter
            Layout.topMargin: 10
            width: 154
            height: 42
            radius: 10
            color: theme.brand600

            Text {
                anchors.centerIn: parent
                text: "+ Nova Página"
                color: "#ffffff"
                font.pixelSize: 13
                font.bold: true
                font.family: theme.fontFamily
            }

            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: emptyState.createRequested()
            }
        }
    }
}
