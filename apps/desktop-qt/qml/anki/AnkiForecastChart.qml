import QtQuick 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: forecastRoot
    Layout.fillWidth: true
    Layout.preferredHeight: 140
    radius: 12
    color: "#161524"
    border.color: "#27272a"
    border.width: 1

    property var forecastData: [12, 8, 15, 6, 9, 4, 11]
    property int maxCount: 20

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 14
        spacing: 8

        RowLayout {
            Layout.fillWidth: true
            Text {
                text: qsTr("Previsão de Carga de Revisão (Próximos 7 Dias)")
                color: "#fffffe"
                font.pixelSize: 13
                font.bold: true
            }
            Item { Layout.fillWidth: true }
        }

        // Bar Chart Row
        RowLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            spacing: 8

            Repeater {
                model: [
                    { day: qsTr("Hoje"), count: forecastRoot.forecastData[0] || 0 },
                    { day: qsTr("+1d"), count: forecastRoot.forecastData[1] || 0 },
                    { day: qsTr("+2d"), count: forecastRoot.forecastData[2] || 0 },
                    { day: qsTr("+3d"), count: forecastRoot.forecastData[3] || 0 },
                    { day: qsTr("+4d"), count: forecastRoot.forecastData[4] || 0 },
                    { day: qsTr("+5d"), count: forecastRoot.forecastData[5] || 0 },
                    { day: qsTr("+6d"), count: forecastRoot.forecastData[6] || 0 }
                ]

                delegate: ColumnLayout {
                    required property var modelData
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    spacing: 4

                    Text {
                        Layout.alignment: Qt.AlignHCenter
                        text: String(modelData.count)
                        color: "#a78bfa"
                        font.pixelSize: 10
                        font.bold: true
                    }

                    Item {
                        Layout.fillWidth: true
                        Layout.fillHeight: true

                        Rectangle {
                            anchors.bottom: parent.bottom
                            anchors.horizontalCenter: parent.horizontalCenter
                            width: Math.min(28, parent.width - 4)
                            height: Math.max(4, parent.height * (modelData.count / Math.max(1, forecastRoot.maxCount)))
                            radius: 4
                            color: "#6366f1"
                        }
                    }

                    Text {
                        Layout.alignment: Qt.AlignHCenter
                        text: modelData.day
                        color: "#71717a"
                        font.pixelSize: 10
                    }
                }
            }
        }
    }
}
