import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../../../ui"

// Select tag chips & Number/Date format picker mirroring TableColumnOptionsEditor.tsx.
ColumnLayout {
    id: optsRoot
    Layout.fillWidth: true
    spacing: 6

    property string columnType: "text"
    property var optionsList: []
    property string numberFormat: "decimal"
    property string dateFormat: "YYYY-MM-DD"

    signal optionsUpdated(var nextOptions)
    signal numberFormatPicked(string fmt)
    signal dateFormatPicked(string fmt)

    // Number Format options
    ColumnLayout {
        visible: optsRoot.columnType === "number"
        Layout.fillWidth: true
        spacing: 4
        Text { text: qsTr("Formato numérico"); color: "#a7a9be"; font.pixelSize: 10; font.bold: true }
        RowLayout {
            Layout.fillWidth: true; spacing: 4
            Repeater {
                model: [{ id: "decimal", label: "123.4" }, { id: "currency", label: "R$ 123" }, { id: "percent", label: "12%" }]
                delegate: Button {
                    required property var modelData
                    Layout.fillWidth: true; Layout.preferredHeight: 24; focusPolicy: Qt.NoFocus
                    onClicked: optsRoot.numberFormatPicked(modelData.id)
                    background: Rectangle {
                        radius: 5
                        color: optsRoot.numberFormat === modelData.id ? "#288b5cf6" : "#0effffff"
                        border.color: optsRoot.numberFormat === modelData.id ? "#8b5cf6" : "transparent"
                    }
                    contentItem: Text { text: modelData.label; color: "#e2e8f0"; font.pixelSize: 10; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                }
            }
        }
    }

    // Date Format options
    ColumnLayout {
        visible: optsRoot.columnType === "date"
        Layout.fillWidth: true
        spacing: 4
        Text { text: qsTr("Formato de data"); color: "#a7a9be"; font.pixelSize: 10; font.bold: true }
        RowLayout {
            Layout.fillWidth: true; spacing: 4
            Repeater {
                model: ["YYYY-MM-DD", "DD/MM/YYYY"]
                delegate: Button {
                    required property string modelData
                    Layout.fillWidth: true; Layout.preferredHeight: 24; focusPolicy: Qt.NoFocus
                    onClicked: optsRoot.dateFormatPicked(modelData)
                    background: Rectangle {
                        radius: 5
                        color: optsRoot.dateFormat === modelData ? "#288b5cf6" : "#0effffff"
                        border.color: optsRoot.dateFormat === modelData ? "#8b5cf6" : "transparent"
                    }
                    contentItem: Text { text: modelData; color: "#e2e8f0"; font.pixelSize: 10; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                }
            }
        }
    }

    // Select tag pills + add input
    ColumnLayout {
        visible: optsRoot.columnType === "select"
        Layout.fillWidth: true
        spacing: 6
        Text { text: qsTr("Opções / Tags"); color: "#a7a9be"; font.pixelSize: 10; font.bold: true }

        Flow {
            visible: optsRoot.optionsList.length > 0
            Layout.fillWidth: true; spacing: 4
            Repeater {
                model: optsRoot.optionsList
                delegate: Rectangle {
                    required property string modelData
                    required property int index
                    height: 22; width: chipRow.implicitWidth + 10; radius: 6
                    color: "#268b5cf6"; border.color: "#448b5cf6"
                    RowLayout {
                        id: chipRow; anchors.centerIn: parent; spacing: 4
                        Text { text: modelData; color: "#e2e8f0"; font.pixelSize: 10 }
                        MouseArea {
                            width: 12; height: 12; cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                var next = optsRoot.optionsList.slice()
                                next.splice(index, 1)
                                optsRoot.optionsUpdated(next)
                            }
                            Text { anchors.centerIn: parent; text: "×"; color: "#fda4af"; font.pixelSize: 11; font.bold: true }
                        }
                    }
                }
            }
        }

        RowLayout {
            Layout.fillWidth: true; spacing: 4
            TextField {
                id: newTagField
                Layout.fillWidth: true; Layout.preferredHeight: 26
                placeholderText: qsTr("Nova opção...")
                color: "#fffffe"; font.pixelSize: 11
                background: Rectangle { radius: 5; color: "#0f0e17"; border.color: "#22ffffff" }
                onAccepted: addTagBtn.triggerAdd()
            }
            Button {
                id: addTagBtn
                Layout.preferredHeight: 26; leftPadding: 8; rightPadding: 8; focusPolicy: Qt.NoFocus
                function triggerAdd() {
                    var t = newTagField.text.trim()
                    if (!t) return
                    var next = optsRoot.optionsList.slice()
                    if (next.indexOf(t) < 0) next.push(t)
                    newTagField.text = ""
                    optsRoot.optionsUpdated(next)
                }
                onClicked: triggerAdd()
                background: Rectangle { radius: 5; color: "#7c3aed" }
                contentItem: Text { text: "+"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
            }
        }
    }
}
