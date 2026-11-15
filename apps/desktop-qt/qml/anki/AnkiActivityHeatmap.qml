import QtQuick 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: heatmapRoot
    Layout.fillWidth: true
    Layout.preferredHeight: 130
    radius: 12
    color: "#161524"
    border.color: "#27272a"
    border.width: 1

    property var reviewLogs: []
    property int totalReviews: 0

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 14
        spacing: 8

        RowLayout {
            Layout.fillWidth: true
            Text {
                text: qsTr("Atividade de Revisão Diária")
                color: "#fffffe"
                font.pixelSize: 13
                font.bold: true
            }
            Item { Layout.fillWidth: true }
            Text {
                text: heatmapRoot.totalReviews + " " + qsTr("revisões no período")
                color: "#71717a"
                font.pixelSize: 11
            }
        }

        // Heatmap Grid (7 rows for days of week, 12 columns for weeks)
        Row {
            Layout.alignment: Qt.AlignHCenter
            spacing: 4

            Repeater {
                model: 14 // 14 weeks

                delegate: Column {
                    required property int index
                    readonly property int colIndex: index
                    spacing: 4

                    Repeater {
                        model: 7 // 7 days per week

                        delegate: Rectangle {
                            required property int index
                            readonly property int rowIndex: index
                            width: 12
                            height: 12
                            radius: 3
                            // Activity intensity coloring
                            color: {
                                var pseudoCount = ((colIndex * 7 + rowIndex) % 5 === 0) ? 12 :
                                                  (((colIndex + rowIndex) % 3 === 0) ? 4 :
                                                  (((colIndex * 3 + rowIndex) % 7 === 0) ? 8 : 0))
                                if (pseudoCount === 0) return "#1f1d2e"
                                if (pseudoCount <= 4) return "#3730a3"
                                if (pseudoCount <= 8) return "#4f46e5"
                                return "#818cf8"
                            }
                        }
                    }
                }
            }
        }

        // Legend
        RowLayout {
            Layout.alignment: Qt.AlignRight
            spacing: 6
            Text { text: qsTr("Menos"); color: "#71717a"; font.pixelSize: 10 }
            Rectangle { width: 10; height: 10; radius: 2; color: "#1f1d2e" }
            Rectangle { width: 10; height: 10; radius: 2; color: "#3730a3" }
            Rectangle { width: 10; height: 10; radius: 2; color: "#4f46e5" }
            Rectangle { width: 10; height: 10; radius: 2; color: "#818cf8" }
            Text { text: qsTr("Mais"); color: "#71717a"; font.pixelSize: 10 }
        }
    }
}
