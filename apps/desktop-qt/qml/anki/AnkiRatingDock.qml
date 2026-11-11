import QtQuick 2.15
import QtQuick.Layouts 1.15

RowLayout {
    id: dockRoot
    Layout.fillWidth: true
    spacing: 14

    property bool isAnswerRevealed: false

    signal revealRequested()
    signal rateRequested(int rating)

    // Reveal Answer Button
    Rectangle {
        visible: !dockRoot.isAnswerRevealed
        Layout.fillWidth: true
        height: 52
        radius: 12
        color: "#6366f1"

        RowLayout {
            anchors.centerIn: parent
            spacing: 8
            Text { text: "Mostrar Resposta"; color: "#ffffff"; font.pixelSize: 15; font.bold: true }
            Text { text: "[Espaço / Enter]"; color: "#c7d2fe"; font.pixelSize: 13 }
        }

        MouseArea {
            anchors.fill: parent
            cursorShape: Qt.PointingHandCursor
            onClicked: dockRoot.revealRequested()
        }
    }

    // 4 FSRS Rating Buttons Dock
    RowLayout {
        visible: dockRoot.isAnswerRevealed
        Layout.fillWidth: true
        spacing: 12

        // 1: Errei (Again)
        Rectangle {
            Layout.fillWidth: true; height: 56; radius: 12
            color: "#1a1924"; border.color: "#55f43f5e"; border.width: 1
            ColumnLayout { anchors.centerIn: parent; spacing: 2
                Text { Layout.alignment: Qt.AlignHCenter; text: "Errei [1]"; color: "#fb7185"; font.pixelSize: 13; font.bold: true }
                Text { Layout.alignment: Qt.AlignHCenter; text: "< 10 min"; color: "#64748b"; font.pixelSize: 10 }
            }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: dockRoot.rateRequested(1) }
        }

        // 2: Difícil (Hard)
        Rectangle {
            Layout.fillWidth: true; height: 56; radius: 12
            color: "#1a1924"; border.color: "#55f59e0b"; border.width: 1
            ColumnLayout { anchors.centerIn: parent; spacing: 2
                Text { Layout.alignment: Qt.AlignHCenter; text: "Difícil [2]"; color: "#fbbf24"; font.pixelSize: 13; font.bold: true }
                Text { Layout.alignment: Qt.AlignHCenter; text: "1.2 dias"; color: "#64748b"; font.pixelSize: 10 }
            }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: dockRoot.rateRequested(2) }
        }

        // 3: Bom (Good)
        Rectangle {
            Layout.fillWidth: true; height: 56; radius: 12
            color: "#1a1924"; border.color: "#5510b981"; border.width: 1
            ColumnLayout { anchors.centerIn: parent; spacing: 2
                Text { Layout.alignment: Qt.AlignHCenter; text: "Bom [3]"; color: "#34d399"; font.pixelSize: 13; font.bold: true }
                Text { Layout.alignment: Qt.AlignHCenter; text: "3.5 dias"; color: "#64748b"; font.pixelSize: 10 }
            }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: dockRoot.rateRequested(3) }
        }

        // 4: Fácil (Easy)
        Rectangle {
            Layout.fillWidth: true; height: 56; radius: 12
            color: "#1a1924"; border.color: "#5538bdf8"; border.width: 1
            ColumnLayout { anchors.centerIn: parent; spacing: 2
                Text { Layout.alignment: Qt.AlignHCenter; text: "Fácil [4]"; color: "#38bdf8"; font.pixelSize: 13; font.bold: true }
                Text { Layout.alignment: Qt.AlignHCenter; text: "7.0 dias"; color: "#64748b"; font.pixelSize: 10 }
            }
            MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: dockRoot.rateRequested(4) }
        }
    }
}
