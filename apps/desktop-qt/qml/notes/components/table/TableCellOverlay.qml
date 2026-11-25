import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../../../ui"

// Contextual interactive editor overlay for checkbox, select dropdown (with checkmarks), and date picker pills.
Rectangle {
    id: overlayRoot
    visible: isActiveCell && (colType === "checkbox" || colType === "select" || colType === "date")
    width: Math.max(120, overlayRow.implicitWidth + 16)
    height: 32
    radius: 8
    color: "#f21e1b2e"
    border.color: isCellInvalid ? "#ef4444" : "#4d8b5cf6"
    border.width: 1

    property bool isActiveCell: false
    property string colType: "text"
    property string currentCellText: ""
    property var selectOptions: []
    property bool isCellInvalid: false

    signal applyCellValue(string val)

    function dateOffsetIso(daysOffset) {
        var d = new Date()
        d.setDate(d.getDate() + daysOffset)
        return d.toISOString().substring(0, 10)
    }

    RowLayout {
        id: overlayRow
        anchors.centerIn: parent
        spacing: 5

        // Checkbox 1-click toggle
        Button {
            visible: overlayRoot.colType === "checkbox"
            Layout.preferredHeight: 22; leftPadding: 8; rightPadding: 8; focusPolicy: Qt.NoFocus
            readonly property bool checkedVal: {
                var c = String(overlayRoot.currentCellText || "").trim().toLowerCase()
                return c === "✓" || c === "true" || c === "1" || c === "sim"
            }
            onClicked: overlayRoot.applyCellValue(checkedVal ? "false" : "true")
            background: Rectangle { radius: 5; color: parent.checkedVal ? "#2610b981" : "#268b5cf6" }
            contentItem: Text {
                text: parent.checkedVal ? qsTr("☑ Marcado (alternar)") : qsTr("☐ Desmarcado (alternar)")
                color: parent.checkedVal ? "#34d399" : "#c4b5fd"
                font.pixelSize: 10; font.bold: true
            }
        }

        // Date Picker quick buttons (Ontem / Hoje / Amanhã + custom input)
        RowLayout {
            visible: overlayRoot.colType === "date"
            spacing: 4
            Repeater {
                model: [{ label: "Ontem", off: -1 }, { label: "Hoje", off: 0 }, { label: "Amanhã", off: 1 }]
                delegate: Button {
                    required property var modelData
                    Layout.preferredHeight: 22; leftPadding: 7; rightPadding: 7; focusPolicy: Qt.NoFocus
                    onClicked: overlayRoot.applyCellValue(overlayRoot.dateOffsetIso(modelData.off))
                    background: Rectangle { radius: 5; color: parent.hovered ? "#338b5cf6" : "#1affffff" }
                    contentItem: Text { text: modelData.label; color: "#c4b5fd"; font.pixelSize: 10; font.bold: true }
                }
            }
        }

        // Select Option Dropdown Chips with Checkmark
        RowLayout {
            visible: overlayRoot.colType === "select"
            spacing: 4
            Repeater {
                model: overlayRoot.selectOptions || []
                delegate: Button {
                    required property string modelData
                    readonly property bool isChosen: String(overlayRoot.currentCellText || "").trim() === modelData
                    Layout.preferredHeight: 22; leftPadding: 8; rightPadding: 8; focusPolicy: Qt.NoFocus
                    onClicked: overlayRoot.applyCellValue(modelData)
                    background: Rectangle {
                        radius: 5
                        color: isChosen ? "#338b5cf6" : (parent.hovered ? "#22ffffff" : "#12ffffff")
                        border.color: isChosen ? "#8b5cf6" : "transparent"
                    }
                    contentItem: Text {
                        text: (isChosen ? "✓ " : "") + modelData
                        color: isChosen ? "#ffffff" : "#e2e8f0"
                        font.pixelSize: 10; font.bold: isChosen
                    }
                }
            }
        }
    }
}
