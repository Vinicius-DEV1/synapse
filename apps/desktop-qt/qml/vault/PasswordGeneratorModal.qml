import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: dialogRoot
    anchors.fill: parent
    color: "#b3000000"
    z: 95

    property string generatedPassword: ""
    property int passLength: 20
    property bool incUpper: true
    property bool incLower: true
    property bool incNumbers: true
    property bool incSymbols: true

    signal copyRequested(string password)
    signal closed()

    function regenerate() {
        generatedPassword = dataController.generateSecurePassword(passLength, incUpper, incLower, incNumbers, incSymbols)
    }

    onVisibleChanged: {
        if (visible) regenerate()
    }

    MouseArea { anchors.fill: parent; onClicked: dialogRoot.closed() }

    Rectangle {
        anchors.centerIn: parent
        width: 480; height: 360; radius: 16
        color: "#161524"; border.color: "#ffffff1a"

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            RowLayout {
                Layout.fillWidth: true
                Text {
                    text: "⚡ Gerador de Senhas Seguras"
                    color: "#fffffe"
                    font.pixelSize: 17
                    font.bold: true
                }
                Item { Layout.fillWidth: true }
                Text {
                    text: "✕"
                    color: "#a7a9be"
                    font.pixelSize: 15
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: dialogRoot.closed()
                    }
                }
            }

            // Display Box with Regenerate Button
            Rectangle {
                Layout.fillWidth: true
                height: 48
                radius: 10
                color: "#0f0e17"
                border.color: "#34d3994d"
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 8
                    spacing: 8

                    TextField {
                        id: passwordDialogText
                        Layout.fillWidth: true
                        readOnly: true
                        font.family: "Monospace"
                        font.pixelSize: 15
                        font.bold: true
                        color: "#34d399"
                        background: null
                        text: dialogRoot.generatedPassword
                        selectByMouse: true
                    }

                    Rectangle {
                        width: 32; height: 32; radius: 6
                        color: "#211f30"
                        Text { anchors.centerIn: parent; text: "🔄"; font.pixelSize: 14 }
                        MouseArea {
                            anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                            onClicked: dialogRoot.regenerate()
                        }
                    }
                }
            }

            // Length Slider Row
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 4

                RowLayout {
                    Layout.fillWidth: true
                    Text { text: "Comprimento da Senha"; color: "#a7a9be"; font.pixelSize: 12 }
                    Item { Layout.fillWidth: true }
                    Text { text: dialogRoot.passLength + " caracteres"; color: "#fffffe"; font.pixelSize: 12; font.bold: true }
                }

                Slider {
                    id: lenSlider
                    Layout.fillWidth: true
                    from: 8
                    to: 48
                    stepSize: 1
                    value: dialogRoot.passLength
                    onMoved: {
                        dialogRoot.passLength = Math.round(value)
                        dialogRoot.regenerate()
                    }
                }
            }

            // Character Set Toggles
            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                // Uppercase Toggle
                Rectangle {
                    Layout.fillWidth: true
                    height: 34
                    radius: 6
                    color: dialogRoot.incUpper ? "#6366f126" : "#211f30"
                    border.color: dialogRoot.incUpper ? "#818cf8" : "#ffffff10"
                    Text { anchors.centerIn: parent; text: "A-Z"; color: dialogRoot.incUpper ? "#818cf8" : "#64748b"; font.pixelSize: 12; font.bold: true }
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            dialogRoot.incUpper = !dialogRoot.incUpper
                            dialogRoot.regenerate()
                        }
                    }
                }

                // Lowercase Toggle
                Rectangle {
                    Layout.fillWidth: true
                    height: 34
                    radius: 6
                    color: dialogRoot.incLower ? "#6366f126" : "#211f30"
                    border.color: dialogRoot.incLower ? "#818cf8" : "#ffffff10"
                    Text { anchors.centerIn: parent; text: "a-z"; color: dialogRoot.incLower ? "#818cf8" : "#64748b"; font.pixelSize: 12; font.bold: true }
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            dialogRoot.incLower = !dialogRoot.incLower
                            dialogRoot.regenerate()
                        }
                    }
                }

                // Numbers Toggle
                Rectangle {
                    Layout.fillWidth: true
                    height: 34
                    radius: 6
                    color: dialogRoot.incNumbers ? "#6366f126" : "#211f30"
                    border.color: dialogRoot.incNumbers ? "#818cf8" : "#ffffff10"
                    Text { anchors.centerIn: parent; text: "0-9"; color: dialogRoot.incNumbers ? "#818cf8" : "#64748b"; font.pixelSize: 12; font.bold: true }
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            dialogRoot.incNumbers = !dialogRoot.incNumbers
                            dialogRoot.regenerate()
                        }
                    }
                }

                // Symbols Toggle
                Rectangle {
                    Layout.fillWidth: true
                    height: 34
                    radius: 6
                    color: dialogRoot.incSymbols ? "#6366f126" : "#211f30"
                    border.color: dialogRoot.incSymbols ? "#818cf8" : "#ffffff10"
                    Text { anchors.centerIn: parent; text: "!@#"; color: dialogRoot.incSymbols ? "#818cf8" : "#64748b"; font.pixelSize: 12; font.bold: true }
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            dialogRoot.incSymbols = !dialogRoot.incSymbols
                            dialogRoot.regenerate()
                        }
                    }
                }
            }

            // Actions Footer
            RowLayout {
                Layout.fillWidth: true
                spacing: 12
                Item { Layout.fillWidth: true }

                Rectangle {
                    width: 140; height: 38; radius: 8
                    color: "#10b981"
                    Text { anchors.centerIn: parent; text: "Copiar Senha"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: dialogRoot.copyRequested(dialogRoot.generatedPassword)
                    }
                }

                Rectangle {
                    width: 80; height: 38; radius: 8
                    color: "#211f30"
                    Text { anchors.centerIn: parent; text: "Fechar"; color: "#a7a9be"; font.pixelSize: 13 }
                    MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: dialogRoot.closed() }
                }
            }
        }
    }
}
