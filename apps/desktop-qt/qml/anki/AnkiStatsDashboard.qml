import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: statsRoot
    spacing: 20

    property var globalStats: ({})

    // 4 Overview KPI Cards
    RowLayout {
        Layout.fillWidth: true
        spacing: 16

        // 1. Total Cards
        Rectangle {
            Layout.fillWidth: true
            height: 104
            radius: 14
            color: "#1a1924"
            border.color: "#ffffff0d"
            border.width: 1

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 16
                RowLayout {
                    spacing: 8
                    Rectangle {
                        width: 28; height: 28; radius: 6; color: "#6366f120"
                        Text { anchors.centerIn: parent; text: "🧠"; font.pixelSize: 14 }
                    }
                    Text { text: "Total de Cartões"; color: "#a7a9be"; font.pixelSize: 12 }
                }
                Text {
                    text: (statsRoot.globalStats.total_cards || 0).toString()
                    color: "#fffffe"
                    font.pixelSize: 24
                    font.bold: true
                }
            }
        }

        // 2. Total Reviews
        Rectangle {
            Layout.fillWidth: true
            height: 104
            radius: 14
            color: "#1a1924"
            border.color: "#ffffff0d"
            border.width: 1

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 16
                RowLayout {
                    spacing: 8
                    Rectangle {
                        width: 28; height: 28; radius: 6; color: "#38bdf820"
                        Text { anchors.centerIn: parent; text: "⚡"; font.pixelSize: 14 }
                    }
                    Text { text: "Total de Revisões"; color: "#a7a9be"; font.pixelSize: 12 }
                }
                Text {
                    text: (statsRoot.globalStats.total_reviews || 0).toString()
                    color: "#fffffe"
                    font.pixelSize: 24
                    font.bold: true
                }
            }
        }

        // 3. Retention Rate
        Rectangle {
            Layout.fillWidth: true
            height: 104
            radius: 14
            color: "#1a1924"
            border.color: "#ffffff0d"
            border.width: 1

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 16
                RowLayout {
                    spacing: 8
                    Rectangle {
                        width: 28; height: 28; radius: 6; color: "#10b98120"
                        Text { anchors.centerIn: parent; text: "🎯"; font.pixelSize: 14 }
                    }
                    Text { text: "Taxa de Retenção"; color: "#a7a9be"; font.pixelSize: 12 }
                }
                Text {
                    text: Number(statsRoot.globalStats.retention_rate || 90.0).toFixed(1) + "%"
                    color: "#34d399"
                    font.pixelSize: 24
                    font.bold: true
                }
            }
        }

        // 4. Avg Stability
        Rectangle {
            Layout.fillWidth: true
            height: 104
            radius: 14
            color: "#1a1924"
            border.color: "#ffffff0d"
            border.width: 1

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 16
                RowLayout {
                    spacing: 8
                    Rectangle {
                        width: 28; height: 28; radius: 6; color: "#f59e0b20"
                        Text { anchors.centerIn: parent; text: "⏱️"; font.pixelSize: 14 }
                    }
                    Text { text: "Estabilidade Média"; color: "#a7a9be"; font.pixelSize: 12 }
                }
                RowLayout {
                    spacing: 6
                    Text {
                        text: Number(statsRoot.globalStats.avg_stability || 0.0).toFixed(1)
                        color: "#fffffe"
                        font.pixelSize: 24
                        font.bold: true
                    }
                    Text { text: "dias"; color: "#a7a9be"; font.pixelSize: 12 }
                }
            }
        }
    }

    // Detailed 2-Card Row: Maturity & FSRS Distribution
    RowLayout {
        Layout.fillWidth: true
        spacing: 16

        // Maturity Distribution Card
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 220
            radius: 14
            color: "#1a1924"
            border.color: "#ffffff0d"
            border.width: 1

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 20
                spacing: 14

                RowLayout {
                    Layout.fillWidth: true
                    Text {
                        text: "Distribuição de Maturidade"
                        color: "#fffffe"
                        font.pixelSize: 14
                        font.bold: true
                    }
                    Item { Layout.fillWidth: true }
                    Text {
                        text: "Dificuldade Média: " + Number(statsRoot.globalStats.avg_difficulty || 0).toFixed(1) + "/10"
                        color: "#a7a9be"
                        font.pixelSize: 12
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 10

                    // Novos
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 10
                        Text { text: "Novos"; color: "#38bdf8"; font.pixelSize: 12; Layout.preferredWidth: 90 }
                        Rectangle {
                            Layout.fillWidth: true; height: 8; radius: 4; color: "#ffffff10"
                            Rectangle {
                                width: parent.width * Math.min(1.0, (statsRoot.globalStats.novos || 0) / Math.max(1, statsRoot.globalStats.total_cards || 1))
                                height: parent.height; radius: 4; color: "#38bdf8"
                            }
                        }
                        Text { text: (statsRoot.globalStats.novos || 0).toString(); color: "#fffffe"; font.pixelSize: 12; font.bold: true; Layout.preferredWidth: 35; horizontalAlignment: Text.AlignRight }
                    }

                    // Aprendendo
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 10
                        Text { text: "Aprendendo"; color: "#f59e0b"; font.pixelSize: 12; Layout.preferredWidth: 90 }
                        Rectangle {
                            Layout.fillWidth: true; height: 8; radius: 4; color: "#ffffff10"
                            Rectangle {
                                width: parent.width * Math.min(1.0, (statsRoot.globalStats.aprendendo || 0) / Math.max(1, statsRoot.globalStats.total_cards || 1))
                                height: parent.height; radius: 4; color: "#f59e0b"
                            }
                        }
                        Text { text: (statsRoot.globalStats.aprendendo || 0).toString(); color: "#fffffe"; font.pixelSize: 12; font.bold: true; Layout.preferredWidth: 35; horizontalAlignment: Text.AlignRight }
                    }

                    // Jovens (< 21 dias)
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 10
                        Text { text: "Jovens (<21d)"; color: "#34d399"; font.pixelSize: 12; Layout.preferredWidth: 90 }
                        Rectangle {
                            Layout.fillWidth: true; height: 8; radius: 4; color: "#ffffff10"
                            Rectangle {
                                width: parent.width * Math.min(1.0, (statsRoot.globalStats.jovens || 0) / Math.max(1, statsRoot.globalStats.total_cards || 1))
                                height: parent.height; radius: 4; color: "#34d399"
                            }
                        }
                        Text { text: (statsRoot.globalStats.jovens || 0).toString(); color: "#fffffe"; font.pixelSize: 12; font.bold: true; Layout.preferredWidth: 35; horizontalAlignment: Text.AlignRight }
                    }

                    // Maduros (>= 21 dias)
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 10
                        Text { text: "Maduros (≥21d)"; color: "#818cf8"; font.pixelSize: 12; Layout.preferredWidth: 90 }
                        Rectangle {
                            Layout.fillWidth: true; height: 8; radius: 4; color: "#ffffff10"
                            Rectangle {
                                width: parent.width * Math.min(1.0, (statsRoot.globalStats.maduros || 0) / Math.max(1, statsRoot.globalStats.total_cards || 1))
                                height: parent.height; radius: 4; color: "#818cf8"
                            }
                        }
                        Text { text: (statsRoot.globalStats.maduros || 0).toString(); color: "#fffffe"; font.pixelSize: 12; font.bold: true; Layout.preferredWidth: 35; horizontalAlignment: Text.AlignRight }
                    }
                }
            }
        }

        // Rating Distribution Card (Errei, Difícil, Bom, Fácil)
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 220
            radius: 14
            color: "#1a1924"
            border.color: "#ffffff0d"
            border.width: 1

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 20
                spacing: 14

                RowLayout {
                    Layout.fillWidth: true
                    Text {
                        text: "Histórico de Avaliações FSRS"
                        color: "#fffffe"
                        font.pixelSize: 14
                        font.bold: true
                    }
                    Item { Layout.fillWidth: true }
                    Text {
                        text: (statsRoot.globalStats.total_reviews || 0) + " respostas"
                        color: "#a7a9be"
                        font.pixelSize: 12
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 10

                    // Errei (Rating 1)
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 10
                        Text { text: "Errei (1)"; color: "#f43f5e"; font.pixelSize: 12; Layout.preferredWidth: 80 }
                        Rectangle {
                            Layout.fillWidth: true; height: 8; radius: 4; color: "#ffffff10"
                            Rectangle {
                                width: parent.width * Math.min(1.0, (statsRoot.globalStats.errei || 0) / Math.max(1, statsRoot.globalStats.total_reviews || 1))
                                height: parent.height; radius: 4; color: "#f43f5e"
                            }
                        }
                        Text { text: (statsRoot.globalStats.errei || 0).toString(); color: "#fffffe"; font.pixelSize: 12; font.bold: true; Layout.preferredWidth: 35; horizontalAlignment: Text.AlignRight }
                    }

                    // Difícil (Rating 2)
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 10
                        Text { text: "Difícil (2)"; color: "#fb923c"; font.pixelSize: 12; Layout.preferredWidth: 80 }
                        Rectangle {
                            Layout.fillWidth: true; height: 8; radius: 4; color: "#ffffff10"
                            Rectangle {
                                width: parent.width * Math.min(1.0, (statsRoot.globalStats.dificil || 0) / Math.max(1, statsRoot.globalStats.total_reviews || 1))
                                height: parent.height; radius: 4; color: "#fb923c"
                            }
                        }
                        Text { text: (statsRoot.globalStats.dificil || 0).toString(); color: "#fffffe"; font.pixelSize: 12; font.bold: true; Layout.preferredWidth: 35; horizontalAlignment: Text.AlignRight }
                    }

                    // Bom (Rating 3)
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 10
                        Text { text: "Bom (3)"; color: "#38bdf8"; font.pixelSize: 12; Layout.preferredWidth: 80 }
                        Rectangle {
                            Layout.fillWidth: true; height: 8; radius: 4; color: "#ffffff10"
                            Rectangle {
                                width: parent.width * Math.min(1.0, (statsRoot.globalStats.bom || 0) / Math.max(1, statsRoot.globalStats.total_reviews || 1))
                                height: parent.height; radius: 4; color: "#38bdf8"
                            }
                        }
                        Text { text: (statsRoot.globalStats.bom || 0).toString(); color: "#fffffe"; font.pixelSize: 12; font.bold: true; Layout.preferredWidth: 35; horizontalAlignment: Text.AlignRight }
                    }

                    // Fácil (Rating 4)
                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 10
                        Text { text: "Fácil (4)"; color: "#10b981"; font.pixelSize: 12; Layout.preferredWidth: 80 }
                        Rectangle {
                            Layout.fillWidth: true; height: 8; radius: 4; color: "#ffffff10"
                            Rectangle {
                                width: parent.width * Math.min(1.0, (statsRoot.globalStats.facil || 0) / Math.max(1, statsRoot.globalStats.total_reviews || 1))
                                height: parent.height; radius: 4; color: "#10b981"
                            }
                        }
                        Text { text: (statsRoot.globalStats.facil || 0).toString(); color: "#fffffe"; font.pixelSize: 12; font.bold: true; Layout.preferredWidth: 35; horizontalAlignment: Text.AlignRight }
                    }
                }
            }
        }
    }
}
