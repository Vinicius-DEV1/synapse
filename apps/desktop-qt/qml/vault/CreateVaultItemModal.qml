import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: modalRoot
    anchors.fill: parent
    color: "#88000000"
    z: 95

    signal itemSubmitted(string label, string username, string password, string url)
    signal closed()

    MouseArea { anchors.fill: parent; onClicked: modalRoot.closed() }

    Rectangle {
        anchors.centerIn: parent
        width: 460
        height: 420
        radius: 16
        color: "#161524"
        border.color: "#14ffffff"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 28
            spacing: 14

            RowLayout {
                Layout.fillWidth: true
                Text { text: "🔑 Nova Credencial no Cofre"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }
                Item { Layout.fillWidth: true }
                Text {
                    text: "✕"; color: "#a7a9be"; font.pixelSize: 16
                    MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: modalRoot.closed() }
                }
            }

            // Service Name Input
            ColumnLayout {
                Layout.fillWidth: true; spacing: 4
                Text { text: "Serviço ou Rótulo"; color: "#a7a9be"; font.pixelSize: 12 }
                Rectangle {
                    Layout.fillWidth: true; height: 38; radius: 8; color: "#15141b"; border.color: vaultLabelInput.activeFocus ? "#7c3aed" : "#15ffffff"
                    TextInput {
                        id: vaultLabelInput; anchors.fill: parent; anchors.leftMargin: 12; anchors.rightMargin: 12
                        verticalAlignment: TextInput.AlignVCenter; color: "#fffffe"; font.pixelSize: 13; selectByMouse: true
                    }
                }
            }

            // Username / Email Input
            ColumnLayout {
                Layout.fillWidth: true; spacing: 4
                Text { text: "Usuário ou E-mail"; color: "#a7a9be"; font.pixelSize: 12 }
                Rectangle {
                    Layout.fillWidth: true; height: 38; radius: 8; color: "#15141b"; border.color: vaultUserInput.activeFocus ? "#7c3aed" : "#15ffffff"
                    TextInput {
                        id: vaultUserInput; anchors.fill: parent; anchors.leftMargin: 12; anchors.rightMargin: 12
                        verticalAlignment: TextInput.AlignVCenter; color: "#fffffe"; font.pixelSize: 13; selectByMouse: true
                    }
                }
            }

            // Password Input
            ColumnLayout {
                Layout.fillWidth: true; spacing: 4
                Text { text: "Senha"; color: "#a7a9be"; font.pixelSize: 12 }
                Rectangle {
                    Layout.fillWidth: true; height: 38; radius: 8; color: "#15141b"; border.color: vaultPassInput.activeFocus ? "#7c3aed" : "#15ffffff"
                    TextInput {
                        id: vaultPassInput; anchors.fill: parent; anchors.leftMargin: 12; anchors.rightMargin: 12
                        verticalAlignment: TextInput.AlignVCenter; color: "#fffffe"; font.pixelSize: 13; echoMode: TextInput.Password; selectByMouse: true
                    }
                }
            }

            // URL Input
            ColumnLayout {
                Layout.fillWidth: true; spacing: 4
                Text { text: "URL do Site (opcional)"; color: "#a7a9be"; font.pixelSize: 12 }
                Rectangle {
                    Layout.fillWidth: true; height: 38; radius: 8; color: "#15141b"; border.color: vaultUrlInput.activeFocus ? "#7c3aed" : "#15ffffff"
                    TextInput {
                        id: vaultUrlInput; anchors.fill: parent; anchors.leftMargin: 12; anchors.rightMargin: 12
                        verticalAlignment: TextInput.AlignVCenter; color: "#fffffe"; font.pixelSize: 13; selectByMouse: true
                    }
                }
            }

            Item { Layout.fillHeight: true }

            // Actions Footer
            RowLayout {
                Layout.fillWidth: true
                spacing: 12
                Item { Layout.fillWidth: true }
                Rectangle {
                    width: 90; height: 38; radius: 8; color: "#211f30"
                    Text { anchors.centerIn: parent; text: "Cancelar"; color: "#a7a9be"; font.pixelSize: 12 }
                    MouseArea { anchors.fill: parent; cursorShape: Qt.PointingHandCursor; onClicked: modalRoot.closed() }
                }
                Rectangle {
                    width: 140; height: 38; radius: 8; color: "#7c3aed"
                    Text { anchors.centerIn: parent; text: "Salvar no Cofre"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            if (vaultLabelInput.text.trim().length > 0 && vaultPassInput.text.length > 0) {
                                modalRoot.itemSubmitted(vaultLabelInput.text, vaultUserInput.text, vaultPassInput.text, vaultUrlInput.text)
                                vaultLabelInput.text = ""
                                vaultUserInput.text = ""
                                vaultPassInput.text = ""
                                vaultUrlInput.text = ""
                            }
                        }
                    }
                }
            }
        }
    }
}
