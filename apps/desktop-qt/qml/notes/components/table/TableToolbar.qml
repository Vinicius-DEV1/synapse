import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../../../ui"
import "../../"

// Floating TableToolbar mirroring TableToolbar.tsx: inline text marks + cell scope + structure + BG palette + clear formatting.
Rectangle {
    id: toolbarRoot
    width: gripBar.implicitWidth + 16
    height: 36
    radius: 9
    color: "#f2181726"
    border.color: "#338b5cf6"
    border.width: 1

    property var tableActions: null
    property var richCommands: null
    property bool active: false
    property int invalidCellCount: 0
    property int visibleFilteredRowCount: -1

    signal deleteTableRequested()

    RowLayout {
        id: gripBar
        anchors.centerIn: parent
        spacing: 3

        // Inline Marks inside tables (since FloatingToolbar hides inside tables)
        Repeater {
            model: [
                { mark: "bold", label: "B", tip: qsTr("Negrito (Ctrl+B)") },
                { mark: "italic", label: "I", tip: qsTr("Itálico (Ctrl+I)") },
                { mark: "underline", label: "U", tip: qsTr("Sublinhado (Ctrl+U)") },
                { mark: "strike", label: "S", tip: qsTr("Tachado") },
                { mark: "code", label: "</>", tip: qsTr("Código inline") },
                { mark: "spoiler", label: "👁", tip: qsTr("Spoiler") }
            ]
            delegate: ToolButton {
                required property var modelData
                focusPolicy: Qt.NoFocus
                Layout.preferredWidth: modelData.mark === "code" ? 26 : 22
                Layout.preferredHeight: 24
                ToolTip.visible: hovered; ToolTip.text: modelData.tip
                onClicked: if (toolbarRoot.richCommands) toolbarRoot.richCommands.toggleMark(modelData.mark)
                background: Rectangle { radius: 4; color: parent.hovered ? "#268b5cf6" : "transparent" }
                contentItem: Text {
                    text: modelData.label
                    color: "#e2e8f0"
                    font.pixelSize: 10
                    font.bold: modelData.mark === "bold"
                    font.italic: modelData.mark === "italic"
                    font.underline: modelData.mark === "underline"
                    font.strikeout: modelData.mark === "strike"
                    horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter
                }
            }
        }

        Rectangle { Layout.preferredWidth: 1; Layout.preferredHeight: 16; color: "#22ffffff" }

        NotesTableSelectionActions {
            active: toolbarRoot.active
            currentScope: toolbarRoot.tableActions ? toolbarRoot.tableActions.selectionScope : "none"
            onSelectionRequested: function(scope) { if (toolbarRoot.tableActions) toolbarRoot.tableActions.selectCells(scope) }
        }

        Rectangle { Layout.preferredWidth: 1; Layout.preferredHeight: 16; color: "#22ffffff" }

        NotesTableStructureActions {
            active: toolbarRoot.active
            currentCellActive: true
            canMoveRowUp: toolbarRoot.tableActions ? toolbarRoot.tableActions.canEditTable("moveRowUp") : false
            canMoveRowDown: toolbarRoot.tableActions ? toolbarRoot.tableActions.canEditTable("moveRowDown") : false
            canMoveColumnLeft: toolbarRoot.tableActions ? toolbarRoot.tableActions.canEditTable("moveColumnLeft") : false
            canMoveColumnRight: toolbarRoot.tableActions ? toolbarRoot.tableActions.canEditTable("moveColumnRight") : false
            canDeleteRow: toolbarRoot.tableActions ? toolbarRoot.tableActions.canEditTable("deleteRow") : false
            canDeleteColumn: toolbarRoot.tableActions ? toolbarRoot.tableActions.canEditTable("deleteColumn") : false
            canMergeOrSplit: toolbarRoot.tableActions ? toolbarRoot.tableActions.canMergeOrSplit : false
            onActionRequested: function(action) { if (toolbarRoot.tableActions) toolbarRoot.tableActions.editTable(action) }
        }

        NotesTableCellBackgroundPalette {
            Layout.preferredWidth: 24; Layout.preferredHeight: 22
            active: toolbarRoot.active
            selectionAvailable: toolbarRoot.tableActions ? toolbarRoot.tableActions.canColorSelectedCells : false
            onColorSelected: function(color, scope) { if (toolbarRoot.tableActions) toolbarRoot.tableActions.setCellBackground(color, scope) }
        }

        ToolButton {
            visible: toolbarRoot.tableActions ? toolbarRoot.tableActions.canColorSelectedCells : false
            Layout.preferredWidth: 22; Layout.preferredHeight: 22; focusPolicy: Qt.NoFocus
            ToolTip.visible: hovered; ToolTip.text: qsTr("Limpar formatação das células")
            onClicked: if (toolbarRoot.tableActions) toolbarRoot.tableActions.clearSelectedCellFormatting()
            background: Rectangle { radius: 4; color: parent.hovered ? "#1affffff" : "transparent" }
            contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: "#cbd5e1"; width: 11; height: 11 }
        }

        ToolButton {
            Layout.preferredWidth: 22; Layout.preferredHeight: 22; focusPolicy: Qt.NoFocus
            ToolTip.visible: hovered; ToolTip.text: qsTr("Excluir tabela")
            onClicked: toolbarRoot.deleteTableRequested()
            background: Rectangle { radius: 4; color: parent.hovered ? "#26ef4444" : "transparent" }
            contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: parent.hovered ? "#fb7185" : "#94a1b2"; width: 11; height: 11 }
        }

        Rectangle {
            visible: toolbarRoot.invalidCellCount > 0 || toolbarRoot.visibleFilteredRowCount >= 0
            Layout.preferredHeight: 20; Layout.preferredWidth: statusBadgeTxt.implicitWidth + 10; radius: 5
            color: toolbarRoot.invalidCellCount > 0 ? "#33ef4444" : "#33f59e0b"
            Text {
                id: statusBadgeTxt; anchors.centerIn: parent
                text: toolbarRoot.invalidCellCount > 0 ? (toolbarRoot.invalidCellCount + " inv.") : (toolbarRoot.visibleFilteredRowCount + " vis.")
                color: toolbarRoot.invalidCellCount > 0 ? "#fda4af" : "#fcd34d"; font.pixelSize: 9; font.bold: true
            }
        }
    }
}
