import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: cancelModalRoot
    anchors.fill: parent
    color: "#aa000000"
    z: 97

    signal saveCancel(string justification)
    signal abortCancel()

    MouseArea {
        anchors.fill: parent
        onClicked: cancelModalRoot.abortCancel()
    }

    Rectangle {
        width: Math.min(460, parent.width - 40)
        height: Math.min(380, parent.height - 40)
        radius: 20
        color: "#161524"
        border.color: "#40ef4444"
        border.width: 1
        anchors.centerIn: parent

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Rectangle {
                    width: 36
                    height: 36
                    radius: 18
                    color: "#26ef4444"
                    Text {
                        anchors.centerIn: parent
                        text: "⚠"
                        color: "#ef4444"
                        font.pixelSize: 18
                    }
                }

                ColumnLayout {
                    spacing: 2
                    Text {
                        text: "Sessão Interrompida"
                        color: "#fffffe"
                        font.pixelSize: 17
                        font.bold: true
                    }
                    Text {
                        text: "Registro de motivo obrigatório para prestação de contas"
                        color: "#f87171"
                        font.pixelSize: 11
                    }
                }
            }

            ColumnLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                spacing: 6

                Text {
                    text: "POR QUE VOCÊ CANCELOU ESTA SESSÃO?"
                    color: "#a7a9be"
                    font.pixelSize: 11
                    font.bold: true
                }

                TextArea {
                    id: reasonArea
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    placeholderText: "Seja honesto consigo mesmo... Ex: Interrupção urgente, cansaço mental..."
                    color: "#fffffe"
                    wrapMode: Text.WordWrap
                    background: Rectangle {
                        color: "#0f0e17"
                        radius: 8
                        border.color: reasonArea.activeFocus ? "#ef4444" : "#2e2f3e"
                        border.width: 1
                    }
                }
            }

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
                        text: "Continuar Sessão"
                        color: "#a7a9be"
                        font.pixelSize: 13
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: cancelModalRoot.abortCancel()
                }

                Button {
                    Layout.fillWidth: true
                    height: 44
                    flat: true
                    background: Rectangle {
                        color: reasonArea.text.trim().length > 0 ? "#ef4444" : "#44ef4444"
                        radius: 10
                    }
                    contentItem: Text {
                        text: "Salvar e Retornar"
                        color: "#ffffff"
                        font.pixelSize: 13
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                    onClicked: {
                        if (reasonArea.text.trim().length > 0) {
                            cancelModalRoot.saveCancel(reasonArea.text.trim())
                        }
                    }
                }
            }
        }
    }
}
