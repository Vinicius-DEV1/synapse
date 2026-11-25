import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../../../ui"

// Full 13-operator column filter builder (+ value2 range for "between") mirroring TableColumnFilterSection.tsx.
ColumnLayout {
    id: filterRoot
    Layout.fillWidth: true
    spacing: 6

    property string columnType: "text"
    property var filterObj: ({ operator: "contains", value: "", value2: "" })
    property var selectOptions: []

    signal filterUpdated(var nextFilter)

    function emitFilter(op, v1, v2) {
        filterUpdated({ operator: op, value: v1, value2: v2 || "" })
    }

    readonly property var operatorList: {
        if (columnType === "number") {
            return [
                { id: "equals", label: "=" },
                { id: "not_equals", label: "≠" },
                { id: "gt", label: ">" },
                { id: "gte", label: "≥" },
                { id: "lt", label: "<" },
                { id: "lte", label: "≤" },
                { id: "between", label: "Entre" },
                { id: "empty", label: "Vazio" },
                { id: "not_empty", label: "Não vazio" }
            ]
        }
        if (columnType === "date") {
            return [
                { id: "equals", label: "Igual" },
                { id: "before", label: "Antes de" },
                { id: "after", label: "Depois de" },
                { id: "between", label: "Entre" },
                { id: "empty", label: "Vazio" },
                { id: "not_empty", label: "Não vazio" }
            ]
        }
        if (columnType === "checkbox") {
            return [
                { id: "is", label: "É" },
                { id: "is_not", label: "Não é" }
            ]
        }
        if (columnType === "select") {
            return [
                { id: "is", label: "É" },
                { id: "is_not", label: "Não é" },
                { id: "empty", label: "Vazio" },
                { id: "not_empty", label: "Não vazio" }
            ]
        }
        return [
            { id: "contains", label: "Contém" },
            { id: "not_contains", label: "Não contém" },
            { id: "equals", label: "Igual" },
            { id: "not_equals", label: "Diferente" },
            { id: "empty", label: "Vazio" },
            { id: "not_empty", label: "Não vazio" }
        ]
    }

    readonly property string activeOp: (filterObj && filterObj.operator) ? filterObj.operator : operatorList[0].id
    readonly property bool needsValue: activeOp !== "empty" && activeOp !== "not_empty"
    readonly property bool needsSecondValue: activeOp === "between"

    RowLayout {
        Layout.fillWidth: true
        Text { text: qsTr("Filtrar linhas"); color: "#a7a9be"; font.pixelSize: 10; font.bold: true; Layout.fillWidth: true }
        Button {
            visible: Boolean(filterRoot.filterObj && (String(filterRoot.filterObj.value || "").length > 0 ||
                filterRoot.activeOp === "empty" || filterRoot.activeOp === "not_empty"))
            Layout.preferredHeight: 18; leftPadding: 6; rightPadding: 6; focusPolicy: Qt.NoFocus
            onClicked: filterRoot.filterUpdated(null)
            background: Rectangle { radius: 4; color: parent.hovered ? "#22ef4444" : "#14ffffff" }
            contentItem: Text { text: qsTr("Limpar"); color: "#fda4af"; font.pixelSize: 9; font.bold: true }
        }
    }

    Flow {
        Layout.fillWidth: true
        spacing: 4
        Repeater {
            model: filterRoot.operatorList
            delegate: Button {
                required property var modelData
                height: 22; leftPadding: 7; rightPadding: 7; focusPolicy: Qt.NoFocus
                onClicked: {
                    var v1 = filterRoot.filterObj ? (filterRoot.filterObj.value || "") : ""
                    if (filterRoot.columnType === "checkbox" && !v1) v1 = "true"
                    filterRoot.emitFilter(modelData.id, v1, filterRoot.filterObj ? filterRoot.filterObj.value2 : "")
                }
                background: Rectangle {
                    radius: 5
                    color: filterRoot.activeOp === modelData.id ? "#338b5cf6" : (parent.hovered ? "#1affffff" : "#0effffff")
                    border.color: filterRoot.activeOp === modelData.id ? "#8b5cf6" : "transparent"
                }
                contentItem: Text {
                    text: modelData.label
                    color: filterRoot.activeOp === modelData.id ? "#c4b5fd" : "#cbd5e1"
                    font.pixelSize: 10
                }
            }
        }
    }

    // Checkbox quick boolean toggle
    RowLayout {
        visible: filterRoot.needsValue && filterRoot.columnType === "checkbox"
        Layout.fillWidth: true
        spacing: 6
        Repeater {
            model: [{ id: "true", label: "☑ Marcado" }, { id: "false", label: "☐ Desmarcado" }]
            delegate: Button {
                required property var modelData
                Layout.fillWidth: true; Layout.preferredHeight: 24; focusPolicy: Qt.NoFocus
                onClicked: filterRoot.emitFilter(filterRoot.activeOp, modelData.id, "")
                background: Rectangle {
                    radius: 5
                    color: (filterRoot.filterObj && filterRoot.filterObj.value === modelData.id) ? "#268b5cf6" : "#0f0e17"
                    border.color: "#22ffffff"
                }
                contentItem: Text { text: modelData.label; color: "#e2e8f0"; font.pixelSize: 10; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
        }
    }

    // Select option filter chips
    Flow {
        visible: filterRoot.needsValue && filterRoot.columnType === "select" && filterRoot.selectOptions.length > 0
        Layout.fillWidth: true
        spacing: 4
        Repeater {
            model: filterRoot.selectOptions
            delegate: Button {
                required property string modelData
                height: 22; leftPadding: 8; rightPadding: 8; focusPolicy: Qt.NoFocus
                onClicked: filterRoot.emitFilter(filterRoot.activeOp, modelData, "")
                background: Rectangle {
                    radius: 5
                    color: (filterRoot.filterObj && filterRoot.filterObj.value === modelData) ? "#338b5cf6" : "#0effffff"
                    border.color: "#22ffffff"
                }
                contentItem: Text { text: modelData; color: "#e2e8f0"; font.pixelSize: 10 }
            }
        }
    }

    RowLayout {
        visible: filterRoot.needsValue && filterRoot.columnType !== "checkbox"
        Layout.fillWidth: true
        spacing: 4

        TextField {
            id: val1Input
            Layout.fillWidth: true; Layout.preferredHeight: 26
            text: (filterRoot.filterObj && filterRoot.filterObj.value) ? filterRoot.filterObj.value : ""
            placeholderText: filterRoot.columnType === "date" ? "YYYY-MM-DD" : qsTr("Valor...")
            color: "#fffffe"; font.pixelSize: 11
            background: Rectangle { radius: 5; color: "#0f0e17"; border.color: "#22ffffff" }
            onTextEdited: filterRoot.emitFilter(filterRoot.activeOp, text, val2Input.text)
        }

        TextField {
            id: val2Input
            visible: filterRoot.needsSecondValue
            Layout.fillWidth: true; Layout.preferredHeight: 26
            text: (filterRoot.filterObj && filterRoot.filterObj.value2) ? filterRoot.filterObj.value2 : ""
            placeholderText: qsTr("Até...")
            color: "#fffffe"; font.pixelSize: 11
            background: Rectangle { radius: 5; color: "#0f0e17"; border.color: "#22ffffff" }
            onTextEdited: filterRoot.emitFilter(filterRoot.activeOp, val1Input.text, text)
        }
    }
}
