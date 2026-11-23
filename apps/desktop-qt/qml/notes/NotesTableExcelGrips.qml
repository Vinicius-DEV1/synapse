import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Item {
    id: gripsRoot
    visible: Boolean(tableActions && tableActions.isInsideTable && textEditor && textEditor.activeFocus)
    z: 98

    property var tableActions: null
    property var textEditor: null
    property var columnTypes: ({}) // colIndex -> "text" | "number" | "date" | "select" | "checkbox"

    x: textEditor ? Math.max(4, Math.min((parent ? parent.width : 600) - width - 4, textEditor.cursorRectangle.x - 24)) : 4
    y: textEditor ? Math.max(4, textEditor.cursorRectangle.y - height - 8) : 4
    width: gripBar.implicitWidth + 14
    height: 32

    Rectangle {
        anchors.fill: parent
        radius: 8
        color: "#181726"
        border.color: "#338b5cf6"
        border.width: 1

        RowLayout {
            id: gripBar
            anchors.centerIn: parent
            spacing: 3

            Text {
                text: "▦"
                color: "#c4b5fd"
                font.pixelSize: 12
                Layout.leftMargin: 2
                Layout.rightMargin: 2
            }

            Repeater {
                model: ["A", "B", "C", "D"]
                delegate: ToolButton {
                    required property string modelData
                    required property int index
                    Layout.preferredWidth: 22
                    Layout.preferredHeight: 22
                    focusPolicy: Qt.NoFocus
                    ToolTip.visible: hovered
                    ToolTip.text: qsTr("Configurar coluna ") + modelData +
                        (gripsRoot.columnTypes[index] ? (" (" + gripsRoot.columnTypes[index] + ")") : "")
                    onClicked: {
                        colTypePopover.columnIndex = index
                        colTypePopover.currentType = gripsRoot.columnTypes[index] || "text"
                        colTypePopover.open()
                    }
                    background: Rectangle {
                        radius: 4
                        color: gripsRoot.columnTypes[index] && gripsRoot.columnTypes[index] !== "text"
                            ? "#288b5cf6" : (parent.hovered ? "#1affffff" : "transparent")
                    }
                    contentItem: Text {
                        text: modelData
                        color: "#e2e8f0"
                        font.pixelSize: 10
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
            }

            Rectangle { Layout.preferredWidth: 1; Layout.preferredHeight: 14; color: "#22ffffff" }

            NotesTableStructureActions {
                active: gripsRoot.visible
                currentCellActive: true
                canMoveRowUp: gripsRoot.tableActions ? gripsRoot.tableActions.canEditTable("moveRowUp") : false
                canMoveRowDown: gripsRoot.tableActions ? gripsRoot.tableActions.canEditTable("moveRowDown") : false
                canMoveColumnLeft: gripsRoot.tableActions ? gripsRoot.tableActions.canEditTable("moveColumnLeft") : false
                canMoveColumnRight: gripsRoot.tableActions ? gripsRoot.tableActions.canEditTable("moveColumnRight") : false
                canDeleteRow: gripsRoot.tableActions ? gripsRoot.tableActions.canEditTable("deleteRow") : false
                canDeleteColumn: gripsRoot.tableActions ? gripsRoot.tableActions.canEditTable("deleteColumn") : false
                canMergeOrSplit: gripsRoot.tableActions ? gripsRoot.tableActions.canMergeOrSplit : false
                onActionRequested: function(action) {
                    if (gripsRoot.tableActions) gripsRoot.tableActions.editTable(action)
                }
            }

            ToolButton {
                Layout.preferredWidth: 24
                Layout.preferredHeight: 22
                focusPolicy: Qt.NoFocus
                ToolTip.visible: hovered
                ToolTip.text: qsTr("Cor da célula")
                onClicked: if (gripsRoot.tableActions) gripsRoot.tableActions.setCellBackground("#338b5cf6", "cell")
                background: Rectangle { radius: 4; color: parent.hovered ? "#1affffff" : "transparent" }
                contentItem: AppIcon { anchors.centerIn: parent; name: "palette"; color: "#c4b5fd"; width: 12; height: 12 }
            }
        }
    }

    NotesTableColumnTypePopover {
        id: colTypePopover
        y: gripsRoot.height + 4
        onTypeSelected: function(colIdx, colType) {
            var next = Object.assign({}, gripsRoot.columnTypes)
            next[colIdx] = colType
            gripsRoot.columnTypes = next
        }
        onInsertColumnRequested: function(right) {
            if (gripsRoot.tableActions) gripsRoot.tableActions.editTable(right ? "columnAfter" : "columnBefore")
        }
        onDeleteColumnRequested: {
            if (gripsRoot.tableActions) gripsRoot.tableActions.editTable("deleteColumn")
        }
    }
}
