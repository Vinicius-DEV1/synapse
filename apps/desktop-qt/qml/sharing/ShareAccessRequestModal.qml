import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: requestModalRoot
    anchors.fill: parent
    color: "#aa000000"
    z: 110

    property string requesterEmail: "colega@equipe.com"
    property string pageTitle: "Resumo de Direito Constitucional"
    property string requestedRole: "editor" // "editor" or "viewer"

    signal approved()
    signal denied()
    signal closed()

    MouseArea {
        anchors.fill: parent
        onClicked: requestModalRoot.closed()
    }

    Rectangle {
        width: Math.min(460, parent.width - 40)
        height: Math.min(340, parent.height - 40)
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
                spacing: 10
                Text { text: "🔔"; font.pixelSize: 20 }
                Text {
                    text: "Solicitação de Acesso"
                    color: "#fffffe"
                    font.pixelSize: 18
                    font.bold: true
                }
            }

            Text {
                text: "O usuário abaixo solicitou permissão para acessar sua página compartilhada:"
                color: "#a7a9be"
                font.pixelSize: 12
                wrapMode: Text.WordWrap
                Layout.fillWidth: true
            }

            Rectangle {
                Layout.fillWidth: true
                height: 72
                radius: 12
                color: "#0f0e17"
                border.color: "#1affffff"
                border.width: 1

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 4

                    Text { text: requestModalRoot.requesterEmail; color: "#fffffe"; font.pixelSize: 13; font.bold: true }
                    Text { text: "Página: " + requestModalRoot.pageTitle; color: "#a7a9be"; font.pixelSize: 11; elide: Text.ElideRight }
                    Text { text: "Nível Solicitado: " + (requestModalRoot.requestedRole === "editor" ? "Editor" : "Leitor"); color: "#8b5cf6"; font.pixelSize: 10; font.bold: true }
                }
            }

            Item { Layout.fillHeight: true }

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Button {
                    Layout.fillWidth: true
                    height: 42
                    flat: true
                    background: Rectangle { color: "#211f30"; radius: 8; border.color: "#33ffffff"; border.width: 1 }
                    contentItem: Text { text: "Recusar"; color: "#f87171"; font.pixelSize: 12; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: {
                        requestModalRoot.denied()
                        requestModalRoot.closed()
                    }
                }

                Button {
                    Layout.fillWidth: true
                    height: 42
                    flat: true
                    background: Rectangle { color: "#10b981"; radius: 8 }
                    contentItem: Text { text: "Aprovar Acesso ✓"; color: "#ffffff"; font.pixelSize: 12; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: {
                        requestModalRoot.approved()
                        requestModalRoot.closed()
                    }
                }
            }
        }
    }
}
