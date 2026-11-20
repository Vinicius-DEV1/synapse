import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: evolutionModalRoot
    anchors.fill: parent
    color: "#aa000000"
    z: 99

    signal closed()

    MouseArea {
        anchors.fill: parent
        onClicked: evolutionModalRoot.closed()
    }

    Rectangle {
        width: Math.min(480, parent.width - 40)
        height: Math.min(300, parent.height - 40)
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
                    text: "Conta em nuvem"
                    color: "#fffffe"
                    font.pixelSize: 18
                    font.bold: true
                }

                Item { Layout.fillWidth: true }

                Button {
                    objectName: "dismissCloudNoticeButton"
                    flat: true
                    onClicked: evolutionModalRoot.closed()
                    contentItem: Text {
                        text: "✕"
                        color: "#a7a9be"
                        font.pixelSize: 16
                    }
                }
            }

            Text {
                objectName: "cloudStatusMessage"
                text: "A autenticação e a sincronização em nuvem ainda não estão disponíveis neste aplicativo Qt. Nenhuma conta, senha, chave ou dado local foi alterado."
                color: "#a7a9be"
                font.pixelSize: 13
                lineHeight: 1.35
                wrapMode: Text.WordWrap
                Layout.fillWidth: true
            }

            Text {
                text: "O cofre local continua protegido pela credencial configurada neste dispositivo. A migração para a Conta Nuvem depende de uma integração nativa verificável."
                color: "#a7a9be"
                font.pixelSize: 12
                wrapMode: Text.WordWrap
                Layout.fillWidth: true
            }

            Item { Layout.fillHeight: true }

            Button {
                objectName: "dismissCloudNoticeAction"
                Layout.fillWidth: true
                height: 44
                flat: true
                background: Rectangle {
                    color: "#8b5cf6"
                    radius: 10
                }
                contentItem: Text {
                    text: "Entendi"
                    color: "#ffffff"
                    font.pixelSize: 13
                    font.bold: true
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
                onClicked: evolutionModalRoot.closed()
            }
        }
    }
}
