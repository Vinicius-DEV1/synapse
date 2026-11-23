pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

ColumnLayout {
    id: notesCardRoot
    property var item: null
    property bool isGoogle: false
    spacing: 24
    Layout.fillWidth: true

    // Secure Notes Card
    Rectangle {
        visible: notesCardRoot.item && notesCardRoot.item.notes
        Layout.fillWidth: true
        Layout.preferredHeight: notesCol.implicitHeight + 32
        radius: 16
        color: "#16161e"
        border.color: "#2e2e38"
        border.width: 1

        ColumnLayout {
            id: notesCol
            anchors.fill: parent
            anchors.margins: 16
            spacing: 8

            Text {
                text: "ANOTAÇÕES SEGURAS"
                color: "#a7a9be"
                font.pixelSize: 11
                font.weight: Font.Bold
            }

            Rectangle {
                Layout.fillWidth: true
                Layout.preferredHeight: notesText.implicitHeight + 20
                radius: 10
                color: "#0f0e17"
                border.color: "#22222d"
                border.width: 1

                Text {
                    id: notesText
                    anchors.fill: parent
                    anchors.margins: 10
                    text: notesCardRoot.item ? (notesCardRoot.item.notes || "") : ""
                    color: "#c4b5fd"
                    font.family: "monospace"
                    font.pixelSize: 12
                    wrapMode: Text.WordWrap
                }
            }
        }
    }

    // Password History Card
    Rectangle {
        visible: (!notesCardRoot.isGoogle || (notesCardRoot.item && notesCardRoot.item.password))
        Layout.fillWidth: true
        Layout.preferredHeight: histCol.implicitHeight + 32
        radius: 16
        color: "#16161e"
        border.color: "#2e2e38"
        border.width: 1

        ColumnLayout {
            id: histCol
            anchors.fill: parent
            anchors.margins: 16
            spacing: 12

            RowLayout {
                spacing: 8
                AppIcon {
                    name: "history"
                    color: "#a7a9be"
                    Layout.preferredWidth: 16
                    Layout.preferredHeight: 16
                }
                Text {
                    text: "HISTÓRICO DE SENHAS"
                    color: "#a7a9be"
                    font.pixelSize: 11
                    font.weight: Font.Bold
                }
            }

            VaultPasswordHistory {
                itemId: notesCardRoot.item ? (notesCardRoot.item.id || "") : ""
            }
        }
    }
}
