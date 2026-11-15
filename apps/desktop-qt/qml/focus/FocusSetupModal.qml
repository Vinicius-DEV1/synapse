import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: setupModalRoot
    anchors.fill: parent
    color: "#aa000000"
    z: 96

    property var existingTags: ["Estudo", "Código", "Leitura", "Trabalho", "Revisão"]
    property string initialTag: "Estudo"
    property string initialDescription: ""
    property int initialMinutes: 25

    signal startSession(string tag, string description, int minutes)
    signal closed()

    MouseArea {
        anchors.fill: parent
        onClicked: setupModalRoot.closed()
    }

    Rectangle {
        width: Math.min(480, parent.width - 40)
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

            // Header
            RowLayout {
                Layout.fillWidth: true
                Text {
                    text: "⏰ Nova Sessão de Foco"
                    color: "#fffffe"
                    font.pixelSize: 18
                    font.bold: true
                }
                Item { Layout.fillWidth: true }
                Button {
                    text: "✕"
                    flat: true
                    onClicked: setupModalRoot.closed()
                    contentItem: Text {
                        text: "✕"
                        color: "#a7a9be"
                        font.pixelSize: 16
                    }
                }
            }

            // Tag Selection
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 6

                Text {
                    text: "TAG DA SESSÃO"
                    color: "#a7a9be"
                    font.pixelSize: 11
                    font.bold: true
                }

                TextField {
                    id: tagInput
                    Layout.fillWidth: true
                    height: 40
                    text: setupModalRoot.initialTag
                    placeholderText: "Ex: Estudo, Código, Leitura..."
                    color: "#fffffe"
                    background: Rectangle {
                        color: "#0f0e17"
                        radius: 8
                        border.color: tagInput.activeFocus ? "#8b5cf6" : "#2e2f3e"
                        border.width: 1
                    }
                }

                Flow {
                    Layout.fillWidth: true
                    spacing: 6
                    Repeater {
                        model: setupModalRoot.existingTags
                        delegate: Rectangle {
                            width: tagChipText.width + 16
                            height: 26
                            radius: 13
                            color: tagInput.text === modelData ? "#8b5cf6" : "#211f30"
                            border.color: tagInput.text === modelData ? "#8b5cf6" : "#33ffffff"
                            border.width: 1

                            Text {
                                id: tagChipText
                                anchors.centerIn: parent
                                text: modelData
                                color: tagInput.text === modelData ? "#ffffff" : "#a7a9be"
                                font.pixelSize: 11
                                font.bold: true
                            }

                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: tagInput.text = modelData
                            }
                        }
                    }
                }
            }

            // Description
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 6

                Text {
                    text: "O QUE VOCÊ VAI FAZER?"
                    color: "#a7a9be"
                    font.pixelSize: 11
                    font.bold: true
                }

                TextField {
                    id: descInput
                    Layout.fillWidth: true
                    height: 40
                    text: setupModalRoot.initialDescription
                    placeholderText: "Ex: Resolver bateria de 20 questões de penal..."
                    color: "#fffffe"
                    background: Rectangle {
                        color: "#0f0e17"
                        radius: 8
                        border.color: descInput.activeFocus ? "#8b5cf6" : "#2e2f3e"
                        border.width: 1
                    }
                }
            }

            // Target Duration Presets
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 8

                RowLayout {
                    Layout.fillWidth: true
                    Text {
                        text: "DURAÇÃO ALVO"
                        color: "#a7a9be"
                        font.pixelSize: 11
                        font.bold: true
                    }
                    Item { Layout.fillWidth: true }
                    Text {
                        text: durationSlider.value + " minutos"
                        color: "#8b5cf6"
                        font.pixelSize: 12
                        font.bold: true
                    }
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8
                    Repeater {
                        model: [15, 25, 30, 45, 60]
                        delegate: Button {
                            Layout.fillWidth: true
                            height: 36
                            flat: true
                            background: Rectangle {
                                color: durationSlider.value === modelData ? "#8b5cf6" : "#211f30"
                                radius: 8
                                border.color: durationSlider.value === modelData ? "#8b5cf6" : "#33ffffff"
                                border.width: 1
                            }
                            contentItem: Text {
                                text: modelData + "m"
                                color: durationSlider.value === modelData ? "#ffffff" : "#a7a9be"
                                font.pixelSize: 12
                                font.bold: true
                                horizontalAlignment: Text.AlignHCenter
                                verticalAlignment: Text.AlignVCenter
                            }
                            onClicked: durationSlider.value = modelData
                        }
                    }
                }

                Slider {
                    id: durationSlider
                    Layout.fillWidth: true
                    from: 5
                    to: 120
                    stepSize: 5
                    value: setupModalRoot.initialMinutes
                }
            }

            Item { Layout.fillHeight: true }

            // Action Buttons
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Button {
                    Layout.fillWidth: true
                    height: 44
                    flat: true
                    background: Rectangle {
                        color: "#211f30"
                        radius: 10
                        border.color: "#33ffffff"
                        border.width: 1
                    }
                    contentItem: Text {
                        text: "Cancelar"
                        color: "#a7a9be"
                        font.pixelSize: 13
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: setupModalRoot.closed()
                }

                Button {
                    Layout.fillWidth: true
                    height: 44
                    flat: true
                    background: Rectangle {
                        color: "#8b5cf6"
                        radius: 10
                    }
                    contentItem: Text {
                        text: "Iniciar Foco"
                        color: "#ffffff"
                        font.pixelSize: 13
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: {
                        var tag = tagInput.text.trim() || "Estudo"
                        var desc = descInput.text.trim() || "Sessão de foco"
                        setupModalRoot.startSession(tag, desc, Math.round(durationSlider.value))
                    }
                }
            }
        }
    }
}
