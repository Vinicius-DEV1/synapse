import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Popup {
    id: colTypePopup
    width: 220
    padding: 10
    closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside

    property string currentType: "text"
    property int columnIndex: 0

    signal typeSelected(int columnIndex, string columnType)
    signal insertColumnRequested(bool right)
    signal deleteColumnRequested()

    background: Rectangle {
        color: "#1a1924"
        radius: 10
        border.color: "#22ffffff"
    }

    contentItem: ColumnLayout {
        spacing: 6

        Text {
            text: qsTr("Coluna ") + String.fromCharCode(65 + (colTypePopup.columnIndex % 26))
            color: "#94a1b2"
            font.pixelSize: 10
            font.bold: true
        }

        Repeater {
            model: [
                { id: "text", label: qsTr("Texto"), icon: "T" },
                { id: "number", label: qsTr("Número"), icon: "#" },
                { id: "date", label: qsTr("Data"), icon: "📅" },
                { id: "select", label: qsTr("Seleção / Tag"), icon: "◉" },
                { id: "checkbox", label: qsTr("Checkbox"), icon: "☑" }
            ]
            delegate: Button {
                required property var modelData
                Layout.fillWidth: true
                Layout.preferredHeight: 28
                onClicked: {
                    colTypePopup.typeSelected(colTypePopup.columnIndex, modelData.id)
                    colTypePopup.close()
                }
                background: Rectangle {
                    radius: 6
                    color: colTypePopup.currentType === modelData.id ? "#288b5cf6" : (parent.hovered ? "#1affffff" : "transparent")
                }
                contentItem: RowLayout {
                    spacing: 8
                    Text { text: modelData.icon; color: "#c4b5fd"; font.pixelSize: 11; Layout.preferredWidth: 16; horizontalAlignment: Text.AlignHCenter }
                    Text { text: modelData.label; color: "#fffffe"; font.pixelSize: 12; Layout.fillWidth: true }
                }
            }
        }

        Rectangle { Layout.fillWidth: true; height: 1; color: "#15ffffff" }

        RowLayout {
            Layout.fillWidth: true
            spacing: 4
            Button {
                Layout.fillWidth: true
                Layout.preferredHeight: 26
                onClicked: { colTypePopup.insertColumnRequested(false); colTypePopup.close() }
                background: Rectangle { radius: 5; color: parent.hovered ? "#1affffff" : "#0effffff" }
                contentItem: Text { text: "← +Col"; color: "#cbd5e1"; font.pixelSize: 10; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            Button {
                Layout.fillWidth: true
                Layout.preferredHeight: 26
                onClicked: { colTypePopup.insertColumnRequested(true); colTypePopup.close() }
                background: Rectangle { radius: 5; color: parent.hovered ? "#1affffff" : "#0effffff" }
                contentItem: Text { text: "+Col →"; color: "#cbd5e1"; font.pixelSize: 10; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            Button {
                Layout.preferredWidth: 28
                Layout.preferredHeight: 26
                onClicked: { colTypePopup.deleteColumnRequested(); colTypePopup.close() }
                background: Rectangle { radius: 5; color: parent.hovered ? "#22ef4444" : "#0effffff" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: "#fda4af"; width: 11; height: 11 }
            }
        }
    }
}
