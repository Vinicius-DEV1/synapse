import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"
import "components/table"

// Upgraded column type + format + options + 13-operator filter popover mirroring TableColumnTypePopover.tsx.
Popup {
    id: colTypePopup
    width: 280
    padding: 12
    closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside

    property int columnIndex: 0
    property string currentType: "text"
    property var selectOptions: []
    property string numberFormat: "decimal"
    property string dateFormat: "YYYY-MM-DD"
    property var activeFilterObj: null

    signal typeSelected(int columnIndex, string columnType, var optionsList, string numberFmt, string dateFmt)
    signal filterUpdated(int columnIndex, var filterObj)
    signal insertColumnRequested(bool right)
    signal deleteColumnRequested()

    background: Rectangle { color: "#1a1924"; radius: 10; border.color: "#22ffffff" }

    contentItem: ColumnLayout {
        spacing: 8

        Text {
            text: qsTr("Coluna ") + String.fromCharCode(65 + (colTypePopup.columnIndex % 26))
            color: "#94a1b2"; font.pixelSize: 10; font.bold: true
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
                Layout.fillWidth: true; Layout.preferredHeight: 26; focusPolicy: Qt.NoFocus
                onClicked: {
                    colTypePopup.currentType = modelData.id
                    colTypePopup.typeSelected(colTypePopup.columnIndex, modelData.id, colTypePopup.selectOptions, colTypePopup.numberFormat, colTypePopup.dateFormat)
                    if (modelData.id !== "select" && modelData.id !== "number" && modelData.id !== "date") colTypePopup.close()
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

        TableColumnOptionsEditor {
            visible: colTypePopup.currentType === "select" || colTypePopup.currentType === "number" || colTypePopup.currentType === "date"
            columnType: colTypePopup.currentType
            optionsList: colTypePopup.selectOptions
            numberFormat: colTypePopup.numberFormat
            dateFormat: colTypePopup.dateFormat
            onOptionsUpdated: function(nextOpts) {
                colTypePopup.selectOptions = nextOpts
                colTypePopup.typeSelected(colTypePopup.columnIndex, colTypePopup.currentType, nextOpts, colTypePopup.numberFormat, colTypePopup.dateFormat)
            }
            onNumberFormatPicked: function(fmt) {
                colTypePopup.numberFormat = fmt
                colTypePopup.typeSelected(colTypePopup.columnIndex, colTypePopup.currentType, colTypePopup.selectOptions, fmt, colTypePopup.dateFormat)
            }
            onDateFormatPicked: function(fmt) {
                colTypePopup.dateFormat = fmt
                colTypePopup.typeSelected(colTypePopup.columnIndex, colTypePopup.currentType, colTypePopup.selectOptions, colTypePopup.numberFormat, fmt)
            }
        }

        Rectangle { Layout.fillWidth: true; height: 1; color: "#15ffffff" }

        TableColumnFilterSection {
            columnType: colTypePopup.currentType
            filterObj: colTypePopup.activeFilterObj
            selectOptions: colTypePopup.selectOptions
            onFilterUpdated: function(obj) { colTypePopup.filterUpdated(colTypePopup.columnIndex, obj) }
        }

        Rectangle { Layout.fillWidth: true; height: 1; color: "#15ffffff" }

        RowLayout {
            Layout.fillWidth: true; spacing: 4
            Button {
                Layout.fillWidth: true; Layout.preferredHeight: 26; focusPolicy: Qt.NoFocus
                onClicked: { colTypePopup.insertColumnRequested(false); colTypePopup.close() }
                background: Rectangle { radius: 5; color: parent.hovered ? "#1affffff" : "#0effffff" }
                contentItem: Text { text: "← +Col"; color: "#cbd5e1"; font.pixelSize: 10; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            Button {
                Layout.fillWidth: true; Layout.preferredHeight: 26; focusPolicy: Qt.NoFocus
                onClicked: { colTypePopup.insertColumnRequested(true); colTypePopup.close() }
                background: Rectangle { radius: 5; color: parent.hovered ? "#1affffff" : "#0effffff" }
                contentItem: Text { text: "+Col →"; color: "#cbd5e1"; font.pixelSize: 10; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            Button {
                Layout.preferredWidth: 28; Layout.preferredHeight: 26; focusPolicy: Qt.NoFocus
                onClicked: { colTypePopup.deleteColumnRequested(); colTypePopup.close() }
                background: Rectangle { radius: 5; color: parent.hovered ? "#22ef4444" : "#0effffff" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: "#fda4af"; width: 11; height: 11 }
            }
        }
    }
}
