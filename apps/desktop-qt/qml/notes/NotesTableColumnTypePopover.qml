import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"
import "components/table"

// Native column type, format and filter controls corresponding to TableColumnTypePopover.tsx.
Popup {
    id: colTypePopup
    width: 240
    padding: 10
    closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside

    property int columnIndex: 0
    property string currentType: "text"
    property var selectOptions: []
    property string numberFormat: "decimal"
    property string dateFormat: "YYYY-MM-DD"
    property var activeFilterObj: null
    property real placementViewportWidth: 0
    property real placementViewportHeight: 0
    property real placementAnchorLeft: 0
    property real placementAnchorTop: 0

    signal typeSelected(int columnIndex, string columnType, var optionsList, string numberFmt, string dateFmt)
    signal typePicked(int columnIndex)
    signal filterUpdated(int columnIndex, var filterObj)
    signal insertColumnRequested(bool right)
    signal deleteColumnRequested()

    function reposition() {
        var popoverHeight = implicitContentHeight + topPadding + bottomPadding
        x = Math.max(8, Math.min(placementViewportWidth - width - 8, placementAnchorLeft))
        y = placementAnchorTop + popoverHeight <= placementViewportHeight - 8
            ? placementAnchorTop
            : Math.max(8, placementAnchorTop - popoverHeight - 8)
    }

    background: Rectangle { color: "#f21a1924"; radius: 12; border.color: "#18ffffff" }

    contentItem: ColumnLayout {
        onImplicitHeightChanged: if (colTypePopup.visible) Qt.callLater(function() { colTypePopup.reposition() })
        spacing: 6

        RowLayout {
            Layout.fillWidth: true
            spacing: 6
            Text {
                Layout.fillWidth: true
                text: qsTr("Tipo da Coluna")
                color: "#a7a9be"
                font.pixelSize: 11
                font.bold: true
                font.letterSpacing: 0.7
                font.capitalization: Font.AllUppercase
            }
            ToolButton {
                id: closeButton
                objectName: "notesTableColumnTypeCloseButton"
                Layout.preferredWidth: 22
                Layout.preferredHeight: 22
                padding: 3
                Accessible.name: qsTr("Fechar tipo da coluna")
                onClicked: colTypePopup.close()
                background: Rectangle { radius: 5; color: closeButton.hovered ? "#1affffff" : "transparent" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: "#a7a9be"; width: 12; height: 12 }
            }
        }

        GridLayout {
            Layout.fillWidth: true
            columns: 3
            rowSpacing: 4
            columnSpacing: 4

            Repeater {
                model: [
                    { id: "text", label: qsTr("Texto"), icon: "T" },
                    { id: "number", label: qsTr("Número"), icon: "#" },
                    { id: "date", label: qsTr("Data"), icon: "calendar" },
                    { id: "select", label: qsTr("Seleção"), icon: "list" },
                    { id: "checkbox", label: qsTr("Checkbox"), icon: "check" }
                ]
                delegate: Button {
                    id: typeButton
                    required property var modelData
                    objectName: "notesTableColumnType_" + modelData.id
                    Layout.fillWidth: true
                    Layout.preferredHeight: 46
                    focusPolicy: Qt.StrongFocus
                    Accessible.name: modelData.label
                    ToolTip.visible: hovered
                    ToolTip.text: modelData.id === "text" ? qsTr("Texto livre")
                                  : modelData.id === "number" ? qsTr("Apenas números")
                                  : modelData.id === "date" ? qsTr("Seletor de data")
                                  : modelData.id === "select" ? qsTr("Lista de opções") : qsTr("Sim / Não")
                    onClicked: {
                        colTypePopup.currentType = modelData.id
                        colTypePopup.typePicked(colTypePopup.columnIndex)
                        colTypePopup.typeSelected(colTypePopup.columnIndex, modelData.id, colTypePopup.selectOptions, colTypePopup.numberFormat, colTypePopup.dateFormat)
                    }
                    background: Rectangle {
                        radius: 8
                        color: colTypePopup.currentType === modelData.id ? "#338b5cf6" : (typeButton.hovered || typeButton.visualFocus ? "#0dffffff" : "transparent")
                        border.color: colTypePopup.currentType === modelData.id ? "#668b5cf6" : (typeButton.visualFocus ? "#668b5cf6" : "transparent")
                        border.width: 1
                    }
                    contentItem: ColumnLayout {
                        spacing: 2
                        AppIcon {
                            visible: typeButton.modelData.icon !== "T" && typeButton.modelData.icon !== "#"
                            name: typeButton.modelData.icon
                            color: colTypePopup.currentType === typeButton.modelData.id ? "#c4b5fd" : "#a7a9be"
                            Layout.preferredWidth: 14
                            Layout.preferredHeight: 14
                            Layout.alignment: Qt.AlignHCenter
                        }
                        Text {
                            visible: typeButton.modelData.icon === "T" || typeButton.modelData.icon === "#"
                            text: typeButton.modelData.icon
                            color: colTypePopup.currentType === typeButton.modelData.id ? "#c4b5fd" : "#a7a9be"
                            font.pixelSize: 13
                            Layout.alignment: Qt.AlignHCenter
                        }
                        Text {
                            text: typeButton.modelData.label
                            color: colTypePopup.currentType === typeButton.modelData.id ? "#ddd6fe" : "#a7a9be"
                            font.pixelSize: 9
                            Layout.alignment: Qt.AlignHCenter
                        }
                    }
                }
            }
        }

        Rectangle { Layout.fillWidth: true; Layout.preferredHeight: 1; color: "#0cffffff" }

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

        Rectangle { Layout.fillWidth: true; Layout.preferredHeight: 1; color: "#0cffffff" }

        TableColumnFilterSection {
            objectName: "notesTableColumnFilterSection"
            columnIndex: colTypePopup.columnIndex
            columnType: colTypePopup.currentType
            filterObj: colTypePopup.activeFilterObj
            selectOptions: colTypePopup.selectOptions
            onFilterUpdated: function(obj) { colTypePopup.filterUpdated(colTypePopup.columnIndex, obj) }
            onExpandToggleRequested: Qt.callLater(function() { colTypePopup.reposition() })
        }

        Rectangle { Layout.fillWidth: true; Layout.preferredHeight: 1; color: "#0cffffff" }

        RowLayout {
            Layout.fillWidth: true; spacing: 4
            Button {
                id: insertLeftButton
                Layout.fillWidth: true; Layout.preferredHeight: 26; focusPolicy: Qt.NoFocus
                onClicked: { colTypePopup.insertColumnRequested(false); colTypePopup.close() }
                background: Rectangle { radius: 5; color: insertLeftButton.hovered ? "#1affffff" : "#0effffff" }
                contentItem: Text { text: "← +Col"; color: "#cbd5e1"; font.pixelSize: 10; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            Button {
                id: insertRightButton
                Layout.fillWidth: true; Layout.preferredHeight: 26; focusPolicy: Qt.NoFocus
                onClicked: { colTypePopup.insertColumnRequested(true); colTypePopup.close() }
                background: Rectangle { radius: 5; color: insertRightButton.hovered ? "#1affffff" : "#0effffff" }
                contentItem: Text { text: "+Col →"; color: "#cbd5e1"; font.pixelSize: 10; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            Button {
                id: deleteColumnButton
                Layout.preferredWidth: 28; Layout.preferredHeight: 26; focusPolicy: Qt.NoFocus
                onClicked: { colTypePopup.deleteColumnRequested(); colTypePopup.close() }
                background: Rectangle { radius: 5; color: deleteColumnButton.hovered ? "#22ef4444" : "#0effffff" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: "#fda4af"; width: 11; height: 11 }
            }
        }
    }
}
