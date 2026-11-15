import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: feedbackModalRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: false
    z: 130

    property string sessionTitle: "Sessão de Prática"
    property int overallScore: 85
    property int durationMinutes: 12
    property var strengthsList: [
        "Articulação clara e objetiva dos pontos conceituais",
        "Uso preciso da terminologia técnica pertinente",
        "Postura colaborativa e escuta ativa durante a interlocução"
    ]
    property var improvementsList: [
        "Aprofundar a análise de trade-offs e métricas quantitativas",
        "Considerar requisitos não funcionais desde o início da resposta"
    ]

    signal closeRequested()

    Shortcut {
        sequence: "Escape"
        enabled: feedbackModalRoot.visible
        onActivated: feedbackModalRoot.closeRequested()
    }

    MouseArea {
        anchors.fill: parent
        onClicked: feedbackModalRoot.closeRequested()
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 48, 700)
        height: Math.min(parent.height - 48, 560)
        radius: 16
        color: "#161524"
        border.color: "#38354d"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            // Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Rectangle {
                    width: 32
                    height: 32
                    radius: 8
                    color: "#10b981"
                    Text { anchors.centerIn: parent; text: "📊"; font.pixelSize: 16 }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Text {
                        text: "Avaliação & Feedback da Sessão"
                        color: "#fffffe"
                        font.pixelSize: 18
                        font.bold: true
                    }
                    Text {
                        text: feedbackModalRoot.sessionTitle + " • " + feedbackModalRoot.durationMinutes + " min de conversação"
                        color: "#94a1b2"
                        font.pixelSize: 12
                    }
                }

                Button {
                    text: "✕"
                    flat: true
                    onClicked: feedbackModalRoot.closeRequested()
                }
            }

            // Score Banner
            Rectangle {
                Layout.fillWidth: true
                height: 72
                radius: 12
                color: "#1f1d2e"
                border.color: "#2e2b44"

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 16
                    spacing: 16

                    Rectangle {
                        width: 44
                        height: 44
                        radius: 22
                        color: feedbackModalRoot.overallScore >= 80 ? "#10b981" : "#f59e0b"
                        Text {
                            anchors.centerIn: parent
                            text: "" + feedbackModalRoot.overallScore
                            color: "#ffffff"
                            font.bold: true
                            font.pixelSize: 16
                        }
                    }

                    ColumnLayout {
                        spacing: 2
                        Text {
                            text: "Desempenho Geral: " + (feedbackModalRoot.overallScore >= 80 ? "Excelente" : "Bom")
                            color: "#fffffe"
                            font.pixelSize: 14
                            font.bold: true
                        }
                        Text {
                            text: "A IA avaliou seu domínio técnico, fluência e coerência argumentativa."
                            color: "#94a1b2"
                            font.pixelSize: 12
                        }
                    }
                }
            }

            // Strengths & Improvements in ScrollView
            ScrollView {
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true

                ColumnLayout {
                    width: parent.width - 24
                    spacing: 14

                    // Strengths
                    Text { text: "Pontos Fortes Demonstrados:"; color: "#34d399"; font.pixelSize: 13; font.bold: true }
                    Repeater {
                        model: feedbackModalRoot.strengthsList
                        RowLayout {
                            spacing: 8
                            Text { text: "✓"; color: "#10b981"; font.bold: true }
                            Text { text: modelData; color: "#fffffe"; font.pixelSize: 12; wrapMode: Text.Wrap; Layout.fillWidth: true }
                        }
                    }

                    // Improvements
                    Item { height: 6 }
                    Text { text: "Oportunidades de Melhoria:"; color: "#fbbf24"; font.pixelSize: 13; font.bold: true }
                    Repeater {
                        model: feedbackModalRoot.improvementsList
                        RowLayout {
                            spacing: 8
                            Text { text: "💡"; font.pixelSize: 12 }
                            Text { text: modelData; color: "#fffffe"; font.pixelSize: 12; wrapMode: Text.Wrap; Layout.fillWidth: true }
                        }
                    }
                }
            }

            // Footer
            RowLayout {
                Layout.fillWidth: true
                Item { Layout.fillWidth: true }
                Button {
                    text: "Concluir Avaliação"
                    background: Rectangle { color: "#10b981"; radius: 8 }
                    contentItem: Text { text: parent.text; color: "#ffffff"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: feedbackModalRoot.closeRequested()
                }
            }
        }
    }
}
