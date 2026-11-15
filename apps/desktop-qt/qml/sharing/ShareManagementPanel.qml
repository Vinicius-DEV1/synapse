import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: panelRoot
    anchors.fill: parent
    color: "#aa000000"
    z: 110

    property var sharedPages: [
        { id: "1", title: "Resumo de Direito Constitucional", url: "https://synapse.local/share/doc-1", views: 12, permission: "view" }
    ]

    signal closed()
    signal revokeRequested(string pageId)

    MouseArea {
        anchors.fill: parent
        onClicked: panelRoot.closed()
    }

    Rectangle {
        width: Math.min(560, parent.width - 40)
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
                    text: "🌐 Painel de Páginas Compartilhadas"
                    color: "#fffffe"
                    font.pixelSize: 18
                    font.bold: true
                }
                Item { Layout.fillWidth: true }
                Button {
                    text: "✕"
                    flat: true
                    onClicked: panelRoot.closed()
                    contentItem: Text {
                        text: "✕"
                        color: "#a7a9be"
                        font.pixelSize: 16
                    }
                }
            }

            Text {
                text: "Audite e gerencie todas as páginas com links públicos ou colaborativos gerados no workspace."
                color: "#a7a9be"
                font.pixelSize: 12
                wrapMode: Text.WordWrap
                Layout.fillWidth: true
            }

            // Shared Items List
            ListView {
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true
                spacing: 8
                model: panelRoot.sharedPages

                delegate: Rectangle {
                    width: parent.width
                    height: 60
                    radius: 10
                    color: "#1a1924"
                    border.color: "#0fffffff"
                    border.width: 1

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 12
                        spacing: 12

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 2
                            Text { text: modelData.title; color: "#fffffe"; font.pixelSize: 13; font.bold: true; elide: Text.ElideRight }
                            Text { text: modelData.url; color: "#8b5cf6"; font.pixelSize: 11; font.family: "Monospace"; elide: Text.ElideMiddle }
                        }

                        Rectangle {
                            width: 60; height: 22; radius: 11
                            color: "#1010b981"
                            Text { anchors.centerIn: parent; text: (modelData.views || 0) + " views"; color: "#10b981"; font.pixelSize: 10; font.bold: true }
                        }

                        Button {
                            height: 30
                            flat: true
                            background: Rectangle { color: "#26ef4444"; radius: 6 }
                            contentItem: Text { text: "Revogar"; color: "#ef4444"; font.pixelSize: 10; font.bold: true; leftPadding: 6; rightPadding: 6 }
                            onClicked: panelRoot.revokeRequested(String(modelData.id))
                        }
                    }
                }
            }

            Item { Layout.fillHeight: true }

            Button {
                Layout.fillWidth: true
                height: 40
                flat: true
                background: Rectangle { color: "#211f30"; radius: 8 }
                contentItem: Text { text: "Fechar"; color: "#a7a9be"; font.pixelSize: 12; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                onClicked: panelRoot.closed()
            }
        }
    }
}
