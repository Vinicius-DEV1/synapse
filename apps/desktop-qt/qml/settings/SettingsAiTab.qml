import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: root
    Layout.fillWidth: true
    implicitHeight: contentCol.implicitHeight + 36
    radius: 14
    color: "#161524"
    border.color: "#18ffffff"
    border.width: 1

    property string selectedModel: "gemini-1.5-flash"
    property string apiKeyText: "AIzaSy..."
    property double temperature: 0.7
    property bool isTesting: false
    property string testResult: ""

    function testKey() {
        isTesting = true
        testResult = ""
        testTimer.start()
    }

    Timer {
        id: testTimer
        interval: 800
        repeat: false
        onTriggered: {
            root.isTesting = false
            root.testResult = "✓ Conexão estabelecida com sucesso com Google Gemini API!"
        }
    }

    ColumnLayout {
        id: contentCol
        anchors.fill: parent
        anchors.margins: 20
        spacing: 16

        // Header
        RowLayout {
            Layout.fillWidth: true
            spacing: 10

            Text { text: "🤖"; font.pixelSize: 22 }
            ColumnLayout {
                spacing: 2
                Text {
                    text: "Inteligência Artificial & Gemini API"
                    color: "#fffffe"
                    font.pixelSize: 16
                    font.bold: true
                }
                Text {
                    text: "Gerencie modelos e chaves de API para transcrição, tutoria e assistentes"
                    color: "#94a3b8"
                    font.pixelSize: 12
                }
            }
        }

        Rectangle { Layout.fillWidth: true; height: 1; color: "#10ffffff" }

        // Model Selector
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 6
            Text { text: "MODELO DE LINGUAGEM PADRÃO"; color: "#a7a9be"; font.pixelSize: 11; font.bold: true }

            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Repeater {
                    model: [
                        { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", desc: "Rápido & Econômico" },
                        { id: "gemini-1.5-pro",   name: "Gemini 1.5 Pro",   desc: "Raciocínio Avançado" },
                        { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", desc: "Próxima Geração" }
                    ]
                    delegate: Rectangle {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 52
                        radius: 8
                        color: root.selectedModel === modelData.id ? "#342b58" : "#1a1928"
                        border.color: root.selectedModel === modelData.id ? "#818cf8" : "#15ffffff"

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 8
                            spacing: 2
                            Text { text: modelData.name; color: "#fffffe"; font.pixelSize: 12; font.bold: true }
                            Text { text: modelData.desc; color: "#a7a9be"; font.pixelSize: 10 }
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: root.selectedModel = modelData.id
                        }
                    }
                }
            }
        }

        // API Key input
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 6
            Text { text: "POOL DE CHAVES GEMINI API"; color: "#a7a9be"; font.pixelSize: 11; font.bold: true }

            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                TextField {
                    id: keyField
                    Layout.fillWidth: true
                    Layout.preferredHeight: 38
                    placeholderText: "Cole sua chave da Gemini API (AIzaSy...)"
                    text: root.apiKeyText
                    echoMode: TextInput.Password
                    color: "#fffffe"
                    font.pixelSize: 13
                    background: Rectangle { color: "#1a1928"; radius: 8; border.color: "#20ffffff" }
                }

                Button {
                    Layout.preferredWidth: 120
                    Layout.preferredHeight: 38
                    text: root.isTesting ? "Testando…" : "Testar Chave"
                    enabled: !root.isTesting
                    onClicked: root.testKey()

                    background: Rectangle { color: parent.hovered ? "#342b58" : "#242335"; radius: 8; border.color: "#30ffffff" }
                    contentItem: Text { text: parent.text; color: "#ddd6fe"; font.pixelSize: 12; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                }
            }

            Text {
                visible: root.testResult.length > 0
                text: root.testResult
                color: "#4ade80"
                font.pixelSize: 12
                font.bold: true
            }
        }

        // Temperature Slider
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 4

            RowLayout {
                Layout.fillWidth: true
                Text { text: "CRIATIVIDADE / TEMPERATURA: " + root.temperature.toFixed(2); color: "#a7a9be"; font.pixelSize: 11; font.bold: true }
                Item { Layout.fillWidth: true }
                Text { text: root.temperature < 0.4 ? "Mais Preciso" : (root.temperature > 0.8 ? "Mais Criativo" : "Balanceado"); color: "#818cf8"; font.pixelSize: 11 }
            }

            Slider {
                Layout.fillWidth: true
                from: 0.1
                to: 1.0
                value: root.temperature
                onMoved: root.temperature = value
            }
        }
    }
}
