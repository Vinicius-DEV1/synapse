import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: statsRoot
    anchors.fill: parent
    color: "#0f0e17" // bg-dark-bg

    property var focusSessions: []

    signal backRequested()

    function computeStats() {
        var totalMinutes = 0
        var completedCount = 0
        var totalCount = focusSessions.length
        var tagMinutes = {}

        for (var i = 0; i < totalCount; i++) {
            var s = focusSessions[i]
            var mins = s.target_time_minutes || 0
            if (s.status === "completed") {
                completedCount++
                totalMinutes += mins
            }
            var tag = s.tag || "Geral"
            tagMinutes[tag] = (tagMinutes[tag] || 0) + mins
        }

        var rate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
        return {
            totalHours: (totalMinutes / 60).toFixed(1),
            totalSessions: totalCount,
            completedSessions: completedCount,
            successRate: rate,
            tagBreakdown: tagMinutes
        }
    }

    readonly property var stats: computeStats()

    ScrollView {
        anchors.fill: parent
        contentWidth: parent.width
        clip: true

        ColumnLayout {
            width: Math.min(900, parent.width - 48)
            anchors.horizontalCenter: parent.horizontalCenter
            spacing: 24

            Item { height: 16 }

            // Header with Back button
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Button {
                    width: 36
                    height: 36
                    flat: true
                    background: Rectangle {
                        color: "#161524"
                        radius: 18
                        border.color: "#1affffff"
                        border.width: 1
                    }
                    contentItem: Text {
                        text: "←"
                        color: "#fffffe"
                        font.pixelSize: 16
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: statsRoot.backRequested()
                }

                ColumnLayout {
                    spacing: 2
                    Text {
                        text: "📊 Estatísticas & Desempenho de Foco"
                        color: "#fffffe"
                        font.pixelSize: 20
                        font.bold: true
                    }
                    Text {
                        text: "Métricas consolidadas de imersão, regularidade e produtividade"
                        color: "#a7a9be"
                        font.pixelSize: 12
                    }
                }
            }

            // Metric Cards Strip
            RowLayout {
                Layout.fillWidth: true
                spacing: 16

                // Total Hours
                Rectangle {
                    Layout.fillWidth: true
                    height: 90
                    radius: 16
                    color: "#161524"
                    border.color: "#1affffff"
                    border.width: 1

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 16
                        spacing: 4

                        Text {
                            text: "TEMPO TOTAL"
                            color: "#a7a9be"
                            font.pixelSize: 10
                            font.bold: true
                            font.letterSpacing: 1
                        }
                        Text {
                            text: statsRoot.stats.totalHours + "h"
                            color: "#8b5cf6"
                            font.pixelSize: 24
                            font.bold: true
                        }
                    }
                }

                // Completed Sessions
                Rectangle {
                    Layout.fillWidth: true
                    height: 90
                    radius: 16
                    color: "#161524"
                    border.color: "#1affffff"
                    border.width: 1

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 16
                        spacing: 4

                        Text {
                            text: "SESSÕES CONCLUÍDAS"
                            color: "#a7a9be"
                            font.pixelSize: 10
                            font.bold: true
                            font.letterSpacing: 1
                        }
                        Text {
                            text: statsRoot.stats.completedSessions + " / " + statsRoot.stats.totalSessions
                            color: "#10b981"
                            font.pixelSize: 24
                            font.bold: true
                        }
                    }
                }

                // Success Rate
                Rectangle {
                    Layout.fillWidth: true
                    height: 90
                    radius: 16
                    color: "#161524"
                    border.color: "#1affffff"
                    border.width: 1

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 16
                        spacing: 4

                        Text {
                            text: "TAXA DE CONCLUSÃO"
                            color: "#a7a9be"
                            font.pixelSize: 10
                            font.bold: true
                            font.letterSpacing: 1
                        }
                        Text {
                            text: statsRoot.stats.successRate + "%"
                            color: "#3b82f6"
                            font.pixelSize: 24
                            font.bold: true
                        }
                    }
                }
            }

            // 14-Day Activity Histogram
            Rectangle {
                Layout.fillWidth: true
                height: 240
                radius: 16
                color: "#161524"
                border.color: "#1affffff"
                border.width: 1

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 20
                    spacing: 12

                    Text {
                        text: "Foco nos Últimos 14 Dias (Minutos)"
                        color: "#fffffe"
                        font.pixelSize: 14
                        font.bold: true
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        spacing: 8

                        Repeater {
                            model: 14
                            delegate: Item {
                                Layout.fillWidth: true
                                Layout.fillHeight: true

                                property string dateStr: {
                                    var d = new Date()
                                    d.setDate(d.getDate() - (13 - index))
                                    return Qt.formatDate(d, "yyyy-MM-dd")
                                }
                                property string labelStr: {
                                    var d = new Date()
                                    d.setDate(d.getDate() - (13 - index))
                                    return Qt.formatDate(d, "dd/MM")
                                }
                                property int minutesForDay: {
                                    var sum = 0
                                    for (var i = 0; i < statsRoot.focusSessions.length; i++) {
                                        var s = statsRoot.focusSessions[i]
                                        if (s.created_at && s.created_at.indexOf(dateStr) !== -1 && s.status === "completed") {
                                            sum += (s.target_time_minutes || 0)
                                        }
                                    }
                                    return sum
                                }

                                ColumnLayout {
                                    anchors.fill: parent
                                    spacing: 4

                                    Item { Layout.fillHeight: true }

                                    Rectangle {
                                        Layout.alignment: Qt.AlignHCenter
                                        width: Math.max(12, parent.width - 8)
                                        height: Math.max(4, Math.min(120, minutesForDay * 1.0))
                                        radius: 4
                                        color: minutesForDay > 0 ? "#8b5cf6" : "#211f30"
                                    }

                                    Text {
                                        Layout.alignment: Qt.AlignHCenter
                                        text: labelStr
                                        color: "#6b7280"
                                        font.pixelSize: 9
                                    }
                                }
                            }
                        }
                    }
                }
            }

            Item { height: 24 }
        }
    }
}
