import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: footerBar
    Layout.fillWidth: true
    height: 64
    color: "#161524"

    property bool isConfirmed: false
    property bool showExplanation: false
    property int selectedOption: -1
    property int currentIndex: 0
    property int totalQuestions: 0

    signal gabaritoToggled()
    signal actionRequested()

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 24
        anchors.rightMargin: 24

        Row {
            spacing: 16
            Text { text: "[1-4 / A-D] Selecionar"; color: "#71717a"; font.pixelSize: 12 }
            Text { text: "[Enter] Confirmar"; color: "#71717a"; font.pixelSize: 12 }
            Text { text: "[G] Gabarito"; color: "#71717a"; font.pixelSize: 12; visible: footerBar.isConfirmed }
        }

        Item { Layout.fillWidth: true }

        // Gabarito Toggle Button
        Button {
            visible: footerBar.isConfirmed
            implicitHeight: 36
            text: footerBar.showExplanation ? "Ocultar Gabarito" : "Ver Gabarito [G]"
            onClicked: footerBar.gabaritoToggled()
        }

        // Main Action Button
        Rectangle {
            implicitHeight: 38
            implicitWidth: 140
            radius: 6
            color: footerBar.selectedOption === -1 ? "#27272a" : "#6366f1"

            Text {
                anchors.centerIn: parent
                text: !footerBar.isConfirmed ? "Confirmar [↵]" : (footerBar.currentIndex < footerBar.totalQuestions - 1 ? "Próxima [↵]" : "Concluir [↵]")
                color: footerBar.selectedOption === -1 ? "#71717a" : "#ffffff"
                font.pixelSize: 13
                font.bold: true
            }

            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: footerBar.actionRequested()
            }
        }
    }
}
