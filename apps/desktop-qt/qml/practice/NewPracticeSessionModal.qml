import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: modalRoot
    anchors.fill: parent
    color: "#88000000"
    z: 150
    visible: false

    property string selectedPreset: "free"

    signal sessionCreated(string title, string prompt)
    signal closed()

    MouseArea { anchors.fill: parent; onClicked: modalRoot.closed() }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 40, 520)
        height: 380
        radius: 16
        color: "#161524"
        border.color: "#18ffffff"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            Text { text: "💬 Nova Sessão de Prática & Tutor"; color: "#fffffe"; font.pixelSize: 17; font.bold: true }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 6
                Text { text: "Título da Sessão"; color: "#a7a9be"; font.pixelSize: 11; font.bold: true }
                TextField {
                    id: sessionTitleInput
                    Layout.fillWidth: true
                    placeholderText: "Ex: Simulação de Algoritmos, Revisão de Python..."
                    color: "#ffffff"
                    background: Rectangle { color: "#0f0e17"; border.color: "#18ffffff"; radius: 8 }
                }
            }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 6
                Text { text: "Modo do Tutor"; color: "#a7a9be"; font.pixelSize: 11; font.bold: true }
                GridLayout {
                    columns: 2
                    Layout.fillWidth: true
                    rowSpacing: 8
                    columnSpacing: 8

                    Repeater {
                        model: [
                            { id: "free", label: "💬 Estudo Livre", prompt: "" },
                            { id: "tech", label: "💻 Entrevista Técnica", prompt: "Você é um entrevistador técnico sênior avaliando algoritmos, arquitetura de sistemas e boas práticas." },
                            { id: "lang", label: "🌍 Conversação em Idiomas", prompt: "Você é um tutor nativo praticando conversação, vocabulário e correção gramatical." },
                            { id: "review", label: "📚 Revisão Geral", prompt: "Você é um mentor acadêmico esclarecendo conceitos teóricos e fixação de conteúdo." }
                        ]

                        delegate: Rectangle {
                            required property var modelData
                            Layout.fillWidth: true
                            height: 36
                            radius: 8
                            color: modalRoot.selectedPreset === modelData.id ? "#8b5cf6" : "#211f30"
                            border.color: modalRoot.selectedPreset === modelData.id ? "#a78bfa" : "#12ffffff"

                            Text {
                                anchors.centerIn: parent
                                text: modelData.label
                                color: "#ffffff"
                                font.pixelSize: 12
                                font.bold: modalRoot.selectedPreset === modelData.id
                            }

                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: modalRoot.selectedPreset = modelData.id
                            }
                        }
                    }
                }
            }

            Item { Layout.fillHeight: true }

            RowLayout {
                Layout.fillWidth: true
                spacing: 12
                Item { Layout.fillWidth: true }

                Rectangle {
                    Layout.preferredWidth: 90; Layout.preferredHeight: 36; radius: 8; color: "#211f30"
                    Text { anchors.centerIn: parent; text: "Cancelar"; color: "#a7a9be"; font.pixelSize: 12 }
                    MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: modalRoot.closed() }
                }

                Rectangle {
                    Layout.preferredWidth: 140; Layout.preferredHeight: 36; radius: 8; color: "#8b5cf6"
                    Text { anchors.centerIn: parent; text: "Iniciar Sessão"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            var title = sessionTitleInput.text.trim()
                            if (title.length === 0) title = "Sessão de Prática"
                            var p = ""
                            if (modalRoot.selectedPreset === "tech") {
                                p = "Você é um entrevistador técnico sênior avaliando algoritmos, arquitetura de sistemas e boas práticas."
                            } else if (modalRoot.selectedPreset === "lang") {
                                p = "Você é um tutor nativo praticando conversação, vocabulário e correção gramatical."
                            } else if (modalRoot.selectedPreset === "review") {
                                p = "Você é um mentor acadêmico esclarecendo conceitos teóricos e fixação de conteúdo."
                            }
                            modalRoot.sessionCreated(title, p)
                            sessionTitleInput.text = ""
                        }
                    }
                }
            }
        }
    }
}
