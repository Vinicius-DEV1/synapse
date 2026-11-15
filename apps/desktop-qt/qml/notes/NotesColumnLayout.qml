pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: colLayoutRoot
    Layout.fillWidth: true
    Layout.preferredHeight: columnsRow.implicitHeight + 16
    implicitHeight: columnsRow.implicitHeight + 16

    property int columnCount: 2
    property var columnsData: ["", ""]
    signal columnContentChanged(int index, string content)

    RowLayout {
        id: columnsRow
        anchors.fill: parent
        spacing: 12

        Repeater {
            model: colLayoutRoot.columnCount

            delegate: Rectangle {
                id: colDelegate
                required property int index

                Layout.fillWidth: true
                Layout.fillHeight: true
                Layout.minimumHeight: 120
                radius: 10
                color: "#16161e"
                border.color: colArea.activeFocus ? "#7c3aed" : "#2e2e38"
                border.width: 1

                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 6

                    Text {
                        text: "Coluna " + (colDelegate.index + 1)
                        color: "#6b7280"
                        font.pixelSize: 10
                        font.weight: Font.Bold
                    }

                    TextArea {
                        id: colArea
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        text: (colLayoutRoot.columnsData && colDelegate.index < colLayoutRoot.columnsData.length) ? colLayoutRoot.columnsData[colDelegate.index] : ""
                        placeholderText: "Digite nesta coluna..."
                        color: "#fffffe"
                        placeholderTextColor: "#4b5563"
                        font.pixelSize: 12
                        wrapMode: Text.WordWrap
                        background: Rectangle { color: "transparent"; border.width: 0 }
                        onEditingFinished: colLayoutRoot.columnContentChanged(colDelegate.index, text)
                    }
                }
            }
        }
    }
}
