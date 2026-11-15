import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: mixerModalRoot
    anchors.fill: parent
    color: "#aa000000"
    z: 97

    signal closed()

    property real rainVol: 0.6
    property real forestVol: 0.0
    property real wavesVol: 0.3
    property real campfireVol: 0.4
    property real noiseVol: 0.0

    MouseArea {
        anchors.fill: parent
        onClicked: mixerModalRoot.closed()
    }

    Rectangle {
        width: Math.min(500, parent.width - 40)
        height: Math.min(520, parent.height - 40)
        radius: 20
        color: "#161524"
        border.color: "#338b5cf6"
        border.width: 1
        anchors.centerIn: parent

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            RowLayout {
                Layout.fillWidth: true
                Text {
                    text: "🎛 Equalizador & Gerador de Ruídos Ambientais"
                    color: "#fffffe"
                    font.pixelSize: 17
                    font.bold: true
                }
                Item { Layout.fillWidth: true }
                Button {
                    text: "✕"
                    flat: true
                    onClicked: mixerModalRoot.closed()
                    contentItem: Text {
                        text: "✕"
                        color: "#a7a9be"
                        font.pixelSize: 16
                    }
                }
            }

            Text {
                text: "Misture camadas sonoras processuais para máxima concentração"
                color: "#a7a9be"
                font.pixelSize: 12
            }

            // Sliders for Ambient Channels
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 12

                // Rain
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12
                    Text { text: "🌧"; font.pixelSize: 18 }
                    Text { text: "Chuva Fina"; color: "#ffffff"; font.pixelSize: 13; Layout.preferredWidth: 100 }
                    Slider {
                        Layout.fillWidth: true
                        from: 0.0; to: 1.0; stepSize: 0.05
                        value: mixerModalRoot.rainVol
                        onMoved: mixerModalRoot.rainVol = value
                    }
                    Text { text: Math.round(mixerModalRoot.rainVol * 100) + "%"; color: "#8b5cf6"; font.pixelSize: 11; Layout.preferredWidth: 36 }
                }

                // Forest
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12
                    Text { text: "🌲"; font.pixelSize: 18 }
                    Text { text: "Floresta / Vento"; color: "#ffffff"; font.pixelSize: 13; Layout.preferredWidth: 100 }
                    Slider {
                        Layout.fillWidth: true
                        from: 0.0; to: 1.0; stepSize: 0.05
                        value: mixerModalRoot.forestVol
                        onMoved: mixerModalRoot.forestVol = value
                    }
                    Text { text: Math.round(mixerModalRoot.forestVol * 100) + "%"; color: "#8b5cf6"; font.pixelSize: 11; Layout.preferredWidth: 36 }
                }

                // Waves
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12
                    Text { text: "🌊"; font.pixelSize: 18 }
                    Text { text: "Ondas do Mar"; color: "#ffffff"; font.pixelSize: 13; Layout.preferredWidth: 100 }
                    Slider {
                        Layout.fillWidth: true
                        from: 0.0; to: 1.0; stepSize: 0.05
                        value: mixerModalRoot.wavesVol
                        onMoved: mixerModalRoot.wavesVol = value
                    }
                    Text { text: Math.round(mixerModalRoot.wavesVol * 100) + "%"; color: "#8b5cf6"; font.pixelSize: 11; Layout.preferredWidth: 36 }
                }

                // Campfire
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12
                    Text { text: "🔥"; font.pixelSize: 18 }
                    Text { text: "Fogueira"; color: "#ffffff"; font.pixelSize: 13; Layout.preferredWidth: 100 }
                    Slider {
                        Layout.fillWidth: true
                        from: 0.0; to: 1.0; stepSize: 0.05
                        value: mixerModalRoot.campfireVol
                        onMoved: mixerModalRoot.campfireVol = value
                    }
                    Text { text: Math.round(mixerModalRoot.campfireVol * 100) + "%"; color: "#8b5cf6"; font.pixelSize: 11; Layout.preferredWidth: 36 }
                }

                // White Noise
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12
                    Text { text: "📻"; font.pixelSize: 18 }
                    Text { text: "Ruído Branco"; color: "#ffffff"; font.pixelSize: 13; Layout.preferredWidth: 100 }
                    Slider {
                        Layout.fillWidth: true
                        from: 0.0; to: 1.0; stepSize: 0.05
                        value: mixerModalRoot.noiseVol
                        onMoved: mixerModalRoot.noiseVol = value
                    }
                    Text { text: Math.round(mixerModalRoot.noiseVol * 100) + "%"; color: "#8b5cf6"; font.pixelSize: 11; Layout.preferredWidth: 36 }
                }
            }

            Item { Layout.fillHeight: true }

            // Presets
            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Button {
                    Layout.fillWidth: true; height: 34; flat: true
                    background: Rectangle { color: "#211f30"; radius: 8 }
                    contentItem: Text { text: "Café Chuva"; color: "#a7a9be"; font.pixelSize: 11; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: { mixerModalRoot.rainVol = 0.8; mixerModalRoot.forestVol = 0.1; mixerModalRoot.wavesVol = 0.0; mixerModalRoot.campfireVol = 0.3; mixerModalRoot.noiseVol = 0.0 }
                }
                Button {
                    Layout.fillWidth: true; height: 34; flat: true
                    background: Rectangle { color: "#211f30"; radius: 8 }
                    contentItem: Text { text: "Foco Total"; color: "#a7a9be"; font.pixelSize: 11; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: { mixerModalRoot.rainVol = 0.3; mixerModalRoot.forestVol = 0.0; mixerModalRoot.wavesVol = 0.0; mixerModalRoot.campfireVol = 0.0; mixerModalRoot.noiseVol = 0.5 }
                }
                Button {
                    Layout.fillWidth: true; height: 34; flat: true
                    background: Rectangle { color: "#211f30"; radius: 8 }
                    contentItem: Text { text: "Noite Calma"; color: "#a7a9be"; font.pixelSize: 11; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: { mixerModalRoot.rainVol = 0.2; mixerModalRoot.forestVol = 0.6; mixerModalRoot.wavesVol = 0.4; mixerModalRoot.campfireVol = 0.5; mixerModalRoot.noiseVol = 0.0 }
                }
            }

            Button {
                Layout.fillWidth: true
                height: 42
                flat: true
                background: Rectangle {
                    color: "#8b5cf6"
                    radius: 10
                }
                contentItem: Text {
                    text: "Aplicar e Fechar"
                    color: "#ffffff"
                    font.pixelSize: 13
                    font.bold: true
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
                onClicked: mixerModalRoot.closed()
            }
        }
    }
}
