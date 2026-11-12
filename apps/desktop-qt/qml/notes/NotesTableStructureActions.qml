import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

pragma ComponentBehavior: Bound

RowLayout {
    id: actionsRoot
    objectName: "notesTableStructureActions"
    visible: active
    spacing: 1

    property bool active: false
    property bool currentCellActive: false
    property bool canMoveRowUp: false
    property bool canMoveRowDown: false
    property bool canMoveColumnLeft: false
    property bool canMoveColumnRight: false
    property bool canDeleteRow: false
    property bool canDeleteColumn: false
    property bool canMergeOrSplit: false
    readonly property var actions: [
        { label: "↥", title: qsTr("Insert row above"), value: "rowBefore" },
        { label: "↧", title: qsTr("Insert row below"), value: "rowAfter" },
        { label: "↑", title: qsTr("Move row up"), value: "moveRowUp", capability: "canMoveRowUp" },
        { label: "↓", title: qsTr("Move row down"), value: "moveRowDown", capability: "canMoveRowDown" },
        { label: "−R", title: qsTr("Delete row"), value: "deleteRow", destructive: true, capability: "canDeleteRow" },
        { label: "↤", title: qsTr("Insert column left"), value: "columnBefore" },
        { label: "↦", title: qsTr("Insert column right"), value: "columnAfter" },
        { label: "←", title: qsTr("Move column left"), value: "moveColumnLeft", capability: "canMoveColumnLeft" },
        { label: "→", title: qsTr("Move column right"), value: "moveColumnRight", capability: "canMoveColumnRight" },
        { label: "−C", title: qsTr("Delete column"), value: "deleteColumn", destructive: true, capability: "canDeleteColumn" },
        { label: "⇄", title: qsTr("Merge or split cells"), value: "mergeOrSplit", capability: "canMergeOrSplit" },
        { label: "×", title: qsTr("Delete table"), value: "deleteTable", destructive: true }
    ]

    signal actionRequested(string action)

    Repeater {
        model: actionsRoot.actions
        delegate: ToolButton {
            id: actionButton
            required property var modelData
            objectName: "notesTableAction" + actionButton.modelData.value.charAt(0).toUpperCase() +
                        actionButton.modelData.value.slice(1)
            visible: actionsRoot.currentCellActive || actionButton.modelData.value === "mergeOrSplit"
            Layout.preferredWidth: 27
            Layout.preferredHeight: 26
            padding: 2
            enabled: !actionButton.modelData.capability || actionsRoot[actionButton.modelData.capability]
            text: actionButton.modelData.label
            Accessible.name: actionButton.modelData.title
            ToolTip.visible: hovered
            ToolTip.text: actionButton.modelData.title

            contentItem: Text {
                text: actionButton.text
                color: !actionButton.enabled ? "#6b6b7b"
                    : actionButton.modelData.destructive ? "#fda4af" : "#c4b5fd"
                font.pixelSize: 11
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            background: Rectangle {
                radius: 4
                color: actionButton.hovered ? "#1affffff" : "#08ffffff"
            }
            onClicked: actionsRoot.actionRequested(actionButton.modelData.value)
        }
    }
}
