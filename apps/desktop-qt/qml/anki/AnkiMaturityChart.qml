import QtQuick 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: maturityRoot
    Layout.fillWidth: true
    Layout.preferredHeight: 110
    radius: 12
    color: "#161524"
    border.color: "#27272a"
    border.width: 1

    property int newCount: 0
    property int learningCount: 0
    property int youngCount: 0
    property int matureCount: 0

    readonly property int total: Math.max(1, newCount + learningCount + youngCount + matureCount)

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 14
        spacing: 10

        RowLayout {
            Layout.fillWidth: true
            Text {
                text: qsTr("Maturidade dos Cartões")
                color: "#fffffe"
                font.pixelSize: 13
                font.bold: true
            }
            Item { Layout.fillWidth: true }
            Text {
                text: (newCount + learningCount + youngCount + matureCount) + " " + qsTr("total")
                color: "#71717a"
                font.pixelSize: 11
            }
        }

        // Stacked Progress Bar
        Row {
            Layout.fillWidth: true
            height: 12

            Rectangle {
                width: parent.width * (maturityRoot.newCount / maturityRoot.total)
                height: 12
                color: "#3b82f6"
            }
            Rectangle {
                width: parent.width * (maturityRoot.learningCount / maturityRoot.total)
                height: 12
                color: "#f59e0b"
            }
            Rectangle {
                width: parent.width * (maturityRoot.youngCount / maturityRoot.total)
                height: 12
                color: "#10b981"
            }
            Rectangle {
                width: parent.width * (maturityRoot.matureCount / maturityRoot.total)
                height: 12
                color: "#059669"
            }
        }

        // Legend row
        RowLayout {
            Layout.fillWidth: true
            spacing: 16

            RowLayout {
                spacing: 6
                Rectangle { width: 8; height: 8; radius: 4; color: "#3b82f6" }
                Text { text: qsTr("Novos:") + " " + maturityRoot.newCount; color: "#93c5fd"; font.pixelSize: 11 }
            }
            RowLayout {
                spacing: 6
                Rectangle { width: 8; height: 8; radius: 4; color: "#f59e0b" }
                Text { text: qsTr("Aprendendo:") + " " + maturityRoot.learningCount; color: "#fcd34d"; font.pixelSize: 11 }
            }
            RowLayout {
                spacing: 6
                Rectangle { width: 8; height: 8; radius: 4; color: "#10b981" }
                Text { text: qsTr("Jovens:") + " " + maturityRoot.youngCount; color: "#6ee7b7"; font.pixelSize: 11 }
            }
            RowLayout {
                spacing: 6
                Rectangle { width: 8; height: 8; radius: 4; color: "#059669" }
                Text { text: qsTr("Maduros:") + " " + maturityRoot.matureCount; color: "#34d399"; font.pixelSize: 11 }
            }
        }
    }
}
