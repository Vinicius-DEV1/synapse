import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: deleteCultureModalRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: false
    z: 130

    property var cultureItem: null

    signal closeRequested()
    signal deleteConfirmed(string itemId)

    Shortcut {
        sequence: "Escape"
        enabled: deleteCultureModalRoot.visible
        onActivated: deleteCultureModalRoot.closeRequested()
    }

    MouseArea {
        anchors.fill: parent
        onClicked: deleteCultureModalRoot.closeRequested()
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 48, 480)
        height: 290
        radius: 16
        color: "#161524"
        border.color: "#38354d"
        border.width: 1

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
                    radius: 8
                    color: "#33f43f5e"
                    Text { anchors.centerIn: parent; text: "🗑️"; font.pixelSize: 18 }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Text { text: "Excluir Obra Cultural"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }
                    Text { text: "Tem certeza de que deseja remover este título do seu catálogo?"; color: "#94a1b2"; font.pixelSize: 12 }
                }

                Button {
                    text: "✕"
                    flat: true
                    onClicked: deleteCultureModalRoot.closeRequested()
                }
            }

            // Info Box
            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                radius: 8
                color: "#11101a"
                border.color: "#2e2b44"

                ColumnLayout {
                    anchors.centerIn: parent
                    spacing: 6

                    Text {
                        text: deleteCultureModalRoot.cultureItem ? (deleteCultureModalRoot.cultureItem.title || "Título") : ""
                        color: "#fffffe"
                        font.pixelSize: 15
                        font.bold: true
                        Layout.alignment: Qt.AlignHCenter
                    }

                    Text {
                        text: deleteCultureModalRoot.cultureItem ? ("Tipo: " + (deleteCultureModalRoot.cultureItem.type || "obra") + " • Status: " + (deleteCultureModalRoot.cultureItem.status || "registrado")) : ""
                        color: "#6b7280"
                        font.pixelSize: 12
                        Layout.alignment: Qt.AlignHCenter
                    }
                }
            }

            // Actions
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Button {
                    text: "Cancelar"
                    Layout.fillWidth: true
                    background: Rectangle { color: "#232135"; radius: 8 }
                    contentItem: Text { text: parent.text; color: "#fffffe"; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: deleteCultureModalRoot.closeRequested()
                }

                Button {
                    text: "Excluir"
                    Layout.fillWidth: true
                    background: Rectangle { color: "#e11d48"; radius: 8 }
                    contentItem: Text { text: parent.text; color: "#ffffff"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: {
                        if (deleteCultureModalRoot.cultureItem && deleteCultureModalRoot.cultureItem.id) {
                            deleteCultureModalRoot.deleteConfirmed(deleteCultureModalRoot.cultureItem.id)
                        }
                        deleteCultureModalRoot.closeRequested()
                    }
                }
            }
        }
    }
}
