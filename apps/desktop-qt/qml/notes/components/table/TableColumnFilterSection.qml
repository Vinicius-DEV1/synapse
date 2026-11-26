import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../../../ui"
import "TableFilterOptions.js" as TableFilterOptions

ColumnLayout {
    id: filterRoot
    Layout.fillWidth: true
    spacing: 6

    property int columnIndex: -1
    property string columnType: "text"
    property var filterObj: null
    property var selectOptions: []
    property bool expanded: false
    property bool changingColumn: false
    property string draftOperator: ""
    property string draftValue: ""
    property string draftValue2: ""
    property var operatorControl: null
    property var textValueControl: null
    property var dateValueControl: null
    property var rangeValueControl: null

    signal filterUpdated(var nextFilter)
    signal expandToggleRequested()

    readonly property var operatorList: TableFilterOptions.operatorsForType(columnType)

    readonly property string activeOp: draftOperator || operatorList[0].id
    readonly property int operatorIndex: {
        for (var index = 0; index < operatorList.length; ++index) {
            if (operatorList[index].id === activeOp) return index
        }
        return 0
    }
    readonly property bool needsValue: activeOp !== "empty" && activeOp !== "not_empty"
    readonly property bool needsSecondValue: activeOp === "between"
    readonly property var selectValueOptions: {
        var values = [{ label: qsTr("Selecione…"), value: "" }]
        for (var index = 0; index < selectOptions.length; ++index)
            values.push({ label: selectOptions[index], value: selectOptions[index] })
        return values
    }

    function resetDraft(nextFilter) {
        draftOperator = nextFilter && nextFilter.operator ? nextFilter.operator : operatorList[0].id
        draftValue = nextFilter && nextFilter.value ? String(nextFilter.value) : ""
        draftValue2 = nextFilter && nextFilter.value2 ? String(nextFilter.value2) : ""
        if (textValueControl) textValueControl.text = draftValue
        if (dateValueControl) dateValueControl.text = draftValue
        if (rangeValueControl) rangeValueControl.text = draftValue2
        if (operatorControl) operatorControl.currentIndex = operatorIndex
    }

    function updateDraftValue(value) {
        draftValue = value
        if (textValueControl) textValueControl.text = value
        if (dateValueControl) dateValueControl.text = value
    }

    function applyDraft() {
        filterUpdated({
            columnIndex: columnIndex,
            operator: activeOp,
            value: needsValue ? draftValue : "",
            value2: needsSecondValue ? draftValue2 : ""
        })
    }

    function clearDraft() {
        resetDraft(null)
        expanded = true
        filterUpdated(null)
    }

    onColumnIndexChanged: {
        changingColumn = true
        expanded = false
        resetDraft(null)
    }
    onColumnTypeChanged: {
        var validOperator = false
        for (var index = 0; index < operatorList.length; ++index) {
            if (operatorList[index].id === draftOperator) validOperator = true
        }
        if (!validOperator) draftOperator = operatorList[0].id
    }
    onFilterObjChanged: {
        if (filterObj !== null) {
            expanded = true
            resetDraft(filterObj)
        } else if (changingColumn) {
            expanded = false
            resetDraft(null)
        }
        changingColumn = false
    }
    Component.onCompleted: {
        expanded = filterObj !== null
        resetDraft(filterObj)
    }

    Button {
        id: filterToggleButton
        objectName: "notesTableFilterToggle"
        Layout.fillWidth: true
        Layout.preferredHeight: 20
        focusPolicy: Qt.StrongFocus
        Accessible.name: qsTr("Filtrar Coluna")
        onClicked: {
            filterRoot.expanded = !filterRoot.expanded
            filterRoot.expandToggleRequested()
        }
        background: Rectangle { color: "transparent"; radius: 4 }
        contentItem: RowLayout {
            spacing: 5
            AppIcon {
                name: "filter"
                color: filterRoot.expanded || filterRoot.filterObj !== null ? "#8b5cf6" : "#a7a9be"
                Layout.preferredWidth: 11
                Layout.preferredHeight: 11
            }
            Text {
                text: qsTr("Filtrar Coluna")
                color: filterRoot.expanded || filterRoot.filterObj !== null ? "#8b5cf6" : "#a7a9be"
                font.pixelSize: 10
                font.bold: true
                font.letterSpacing: 0.6
                font.capitalization: Font.AllUppercase
                Layout.fillWidth: true
                verticalAlignment: Text.AlignVCenter
            }
            Rectangle {
                visible: filterRoot.filterObj !== null
                Layout.preferredWidth: 6
                Layout.preferredHeight: 6
                radius: 3
                color: "#8b5cf6"
            }
        }
    }

    ColumnLayout {
        objectName: "notesTableFilterEditor"
        visible: filterRoot.expanded
        Layout.fillWidth: true
        spacing: 6

        TableFilterComboBox {
            id: operatorSelector
            objectName: "notesTableFilterOperator"
            Component.onCompleted: filterRoot.operatorControl = operatorSelector
            accessibleLabel: qsTr("Operador do filtro")
            options: filterRoot.operatorList
            optionValueRole: "id"
            selectedValue: filterRoot.activeOp
            onValueActivated: function(value) {
                filterRoot.draftOperator = value
                operatorSelector.currentIndex = filterRoot.operatorIndex
            }
        }

        TableFilterComboBox {
            objectName: "notesTableFilterSelectValue"
            visible: filterRoot.needsValue && filterRoot.columnType === "select"
            accessibleLabel: qsTr("Valor do filtro")
            options: filterRoot.selectValueOptions
            selectedValue: filterRoot.draftValue
            onValueActivated: function(value) { filterRoot.updateDraftValue(value) }
        }

        TableFilterComboBox {
            objectName: "notesTableFilterCheckboxValue"
            visible: filterRoot.needsValue && filterRoot.columnType === "checkbox"
            accessibleLabel: qsTr("Valor do filtro")
            options: [
                { label: qsTr("Marcado (Sim)"), value: "true" },
                { label: qsTr("Desmarcado (Não)"), value: "false" }
            ]
            selectedValue: filterRoot.draftValue === "false" ? "false" : "true"
            onValueActivated: function(value) { filterRoot.updateDraftValue(value) }
        }

        RowLayout {
            visible: filterRoot.needsValue && filterRoot.columnType !== "select" && filterRoot.columnType !== "checkbox"
            Layout.fillWidth: true
            spacing: 4
            TextField {
                id: val1Input
                objectName: "notesTableFilterValue"
                Component.onCompleted: filterRoot.textValueControl = val1Input
                Layout.fillWidth: true
                Layout.preferredHeight: 24
                visible: filterRoot.columnType !== "date"
                text: filterRoot.draftValue
                placeholderText: qsTr("Valor…")
                Accessible.name: qsTr("Valor do filtro")
                color: "#e2e8f0"
                font.pixelSize: 11
                inputMethodHints: filterRoot.columnType === "number" ? Qt.ImhFormattedNumbersOnly : Qt.ImhNone
                background: Rectangle { radius: 5; color: "#0f0e17"; border.color: parent.activeFocus ? "#808b5cf6" : "#1affffff" }
                onTextEdited: filterRoot.updateDraftValue(text)
            }
            TextField {
                id: dateValueInput
                objectName: "notesTableFilterDateValue"
                Component.onCompleted: filterRoot.dateValueControl = dateValueInput
                Layout.fillWidth: true
                Layout.preferredHeight: 24
                visible: filterRoot.columnType === "date"
                text: filterRoot.draftValue
                placeholderText: "YYYY-MM-DD"
                Accessible.name: qsTr("Data do filtro")
                color: "#e2e8f0"
                font.pixelSize: 11
                background: Rectangle { radius: 5; color: "#0f0e17"; border.color: parent.activeFocus ? "#808b5cf6" : "#1affffff" }
                onTextEdited: filterRoot.updateDraftValue(text)
            }
            TextField {
                id: val2Input
                objectName: "notesTableFilterValueTo"
                Component.onCompleted: filterRoot.rangeValueControl = val2Input
                visible: filterRoot.needsSecondValue
                Layout.fillWidth: true
                Layout.preferredHeight: 24
                text: filterRoot.draftValue2
                placeholderText: qsTr("Até…")
                Accessible.name: qsTr("Valor final do filtro")
                color: "#e2e8f0"
                font.pixelSize: 11
                inputMethodHints: filterRoot.columnType === "number" ? Qt.ImhFormattedNumbersOnly : Qt.ImhNone
                background: Rectangle { radius: 5; color: "#0f0e17"; border.color: parent.activeFocus ? "#808b5cf6" : "#1affffff" }
                onTextEdited: filterRoot.draftValue2 = text
            }
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: 4
            Button {
                id: applyFilterButton
                objectName: "notesTableFilterApply"
                Layout.fillWidth: true
                Layout.preferredHeight: 24
                focusPolicy: Qt.StrongFocus
                Accessible.name: qsTr("Aplicar filtro")
                onClicked: filterRoot.applyDraft()
                background: Rectangle { radius: 5; color: applyFilterButton.hovered ? "#4d7134d1" : "#337c3aed"; border.color: "#668b5cf6" }
                contentItem: Text { text: qsTr("Aplicar"); color: "#ddd6fe"; font.pixelSize: 10; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            Button {
                id: clearFilterButton
                objectName: "notesTableFilterClear"
                visible: filterRoot.filterObj !== null
                Layout.preferredHeight: 24
                leftPadding: 10
                rightPadding: 10
                focusPolicy: Qt.StrongFocus
                Accessible.name: qsTr("Limpar filtro")
                onClicked: filterRoot.clearDraft()
                background: Rectangle { radius: 5; color: clearFilterButton.hovered ? "#33f43f5e" : "#1af43f5e"; border.color: "#33f43f5e" }
                contentItem: Text { text: qsTr("Limpar"); color: "#fda4af"; font.pixelSize: 10; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
        }
    }
}
