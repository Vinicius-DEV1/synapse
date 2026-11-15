import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: batchBarRoot
    Layout.fillWidth: true
    height: 44
    radius: 8
    color: "#1e1d2d"
    border.color: "#818cf8"
    border.width: 1
    visible: selectedCount > 0

    property int selectedCount: 0

    signal selectAllRequested()
    signal clearSelectionRequested()
    signal batchDeleteRequested()
    signal batchResetRequested()

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 16
        anchors.rightMargin: 16
        spacing: 12

        Text {
            text: batchBarRoot.selectedCount + " " + qsTr("cartão(ões) selecionado(s)")
            color: "#fffffe"
            font.pixelSize: 12
            font.bold: true
        }

        Item { Layout.fillWidth: true }

        Button {
            text: qsTr("Selecionar Todos")
            flat: true
            onClicked: batchBarRoot.selectAllRequested()
            contentItem: Text { text: parent.text; color: "#a5b4fc"; font.pixelSize: 11 }
        }

        Button {
            text: qsTr("Limpar Seleção")
            flat: true
            onClicked: batchBarRoot.clearSelectionRequested()
            contentItem: Text { text: parent.text; color: "#71717a"; font.pixelSize: 11 }
        }

        Button {
            text: qsTr("Reiniciar FSRS")
            flat: true
            onClicked: batchBarRoot.batchResetRequested()
            contentItem: Text { text: parent.text; color: "#fbbf24"; font.pixelSize: 11; font.bold: true }
        }

        Button {
            text: qsTr("Excluir")
            flat: true
            onClicked: batchBarRoot.batchDeleteRequested()
            contentItem: Text { text: parent.text; color: "#f87171"; font.pixelSize: 11; font.bold: true }
        }
    }
}
