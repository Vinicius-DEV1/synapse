import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "NotesHtmlEscaping.js" as HtmlEscaping

ColumnLayout {
    id: pickerPanel

    property var controller: null
    property string mode: ""
    property string pageId: ""
    property var listItems: []
    property string searchFilter: ""
    property string errorMessage: ""
    property int selectedHabitIndex: 0
    readonly property bool hasHabitTitleCollision: {
        if (mode !== "habito") return false
        var query = searchFilter.trim().toLowerCase()
        return query.length > 0 && listItems.some(function(item) {
            return String(item.title || "").trim().toLowerCase() === query
        })
    }
    readonly property bool showCreateAction: searchFilter.trim().length > 0 && !hasHabitTitleCollision
    readonly property bool showHabitEmptyState: mode === "habito" && filteredListItems.length === 0 &&
        !showCreateAction && errorMessage.length === 0
    readonly property var filteredListItems: {
        var query = searchFilter.trim().toLowerCase()
        var items = !query.length ? listItems : listItems.filter(function(item) {
            var label = String(item.title || item.label || item.name || "").toLowerCase()
            return label.indexOf(query) >= 0
        })
        return items.map(function(item) {
            var mapped = Object.assign({}, item)
            mapped.__picker = pickerPanel
            return mapped
        })
    }

    signal filterEdited(string value)
    signal insertWidgetRequested(string html)
    signal closeRequested()

    spacing: 8

    onSearchFilterChanged: selectedHabitIndex = 0
    onListItemsChanged: selectedHabitIndex = 0

    function focusSearchField() {
        habitSearchField.forceActiveFocus()
    }

    function habitOptionCount() {
        return filteredListItems.length + (showCreateAction ? 1 : 0)
    }

    function handleHabitNavigationKey(key) {
        if (mode !== "habito") return false
        var optionCount = habitOptionCount()
        if (key === Qt.Key_Escape) {
            closeRequested()
            return true
        }
        if (optionCount <= 0) return false
        if (key === Qt.Key_Down) {
            selectedHabitIndex = (selectedHabitIndex + 1) % optionCount
            return true
        }
        if (key === Qt.Key_Up) {
            selectedHabitIndex = (selectedHabitIndex - 1 + optionCount) % optionCount
            return true
        }
        if (key === Qt.Key_Return || key === Qt.Key_Enter) {
            activateHabitOption(selectedHabitIndex)
            return true
        }
        if (key >= Qt.Key_1 && key <= Qt.Key_9) {
            var numberIndex = key - Qt.Key_1
            if (numberIndex < optionCount) {
                selectedHabitIndex = numberIndex
                activateHabitOption(numberIndex)
                return true
            }
        }
        return false
    }

    function activateHabitOption(index) {
        var items = filteredListItems
        if (index < 0 || index >= habitOptionCount()) return
        if (index < items.length) insertPickedItem(items[index])
        else createQuickRecord()
    }

    function insertPickedItem(item) {
        if (mode === "question") {
            var safeTitle = HtmlEscaping.escapeHtmlAttribute(item.title || "Bateria")
            var safeId = HtmlEscaping.escapeHtmlAttribute(item.id)
            insertWidgetRequested(
                "<div class=\"question-block\" data-type=\"question-block\" data-battery-id=\"" +
                safeId + "\" data-cached-title=\"" + safeTitle + "\" data-title=\"" + safeTitle + "\"></div>")
        } else if (mode === "habito") {
            var habitTitle = HtmlEscaping.escapeHtmlAttribute(item.title || item.name || "Hábito")
            var streak = Number(item.current_streak || 0)
            var habitId = HtmlEscaping.escapeHtmlAttribute(item.id)
            insertWidgetRequested(
                "<span class=\"habit-widget\" data-type=\"habit-widget\" data-habit-id=\"" +
                habitId + "\" data-title=\"" + habitTitle + "\" data-streak=\"" + streak + "\"></span>")
        } else {
            return
        }
        closeRequested()
    }

    function createQuickRecord() {
        var title = searchFilter.trim()
        var c = pickerPanel.controller
        if (!c || !title) return

        if (mode === "habito" && typeof c.createHabit === "function") {
            if (hasHabitTitleCollision) return
            errorMessage = ""
            var knownIds = new Set(listItems.map(function(item) { return String(item.id || "") }))
            var created = c.createHabit(title, "#10b981", "🔥", 7)
            if (created && typeof c.getHabits === "function") {
                var updatedHabits = c.getHabits() || []
                var newHabit = updatedHabits.find(function(item) {
                    return String(item.title || "").trim().toLowerCase() === title.toLowerCase() &&
                        !knownIds.has(String(item.id || ""))
                })
                if (!newHabit || !newHabit.id) {
                    errorMessage = qsTr("O hábito foi criado, mas não foi possível localizar o registro para vinculá-lo.")
                    listItems = updatedHabits
                    return
                }
                listItems = updatedHabits
                var safeTitle = HtmlEscaping.escapeHtmlAttribute(title)
                insertWidgetRequested(
                    "<span class=\"habit-widget\" data-type=\"habit-widget\" data-habit-id=\"" +
                    HtmlEscaping.escapeHtmlAttribute(newHabit.id) + "\" data-title=\"" + safeTitle + "\" data-streak=\"0\"></span>")
                closeRequested()
            } else {
                errorMessage = qsTr("Não foi possível criar o hábito.")
            }
        } else if (mode === "question") {
            errorMessage = ""
            if (typeof c.createNoteQuizBattery !== "function") {
                errorMessage = qsTr("Não foi possível criar ou vincular a bateria à página atual.")
                return
            }
            var batteryId = c.createNoteQuizBattery(title, "", pageId)
            if (batteryId) {
                var safeBatteryId = HtmlEscaping.escapeHtmlAttribute(batteryId)
                var safeBatteryTitle = HtmlEscaping.escapeHtmlAttribute(title)
                insertWidgetRequested(
                    "<div class=\"question-block\" data-type=\"question-block\" data-battery-id=\"" +
                    safeBatteryId + "\" data-cached-title=\"" + safeBatteryTitle +
                    "\" data-title=\"" + safeBatteryTitle + "\"></div>")
                closeRequested()
            } else {
                errorMessage = qsTr("Não foi possível criar ou vincular a bateria à página atual.")
            }
        }
    }

    RowLayout {
        visible: pickerPanel.mode === "habito" || pickerPanel.mode === "question"
        Layout.fillWidth: true
        spacing: 6
        TextField {
            id: habitSearchField
            objectName: "notesSetupHabitSearchField"
            Layout.fillWidth: true
            Layout.preferredHeight: 32
            text: pickerPanel.searchFilter
            placeholderText: pickerPanel.mode === "habito"
                ? qsTr("Buscar ou digitar novo hábito...") : qsTr("Buscar ou criar nova bateria...")
            color: "#fffffe"
            font.pixelSize: 12
            onTextEdited: {
                pickerPanel.errorMessage = ""
                pickerPanel.filterEdited(text)
            }
            Keys.onPressed: function(event) {
                if (pickerPanel.handleHabitNavigationKey(event.key)) event.accepted = true
            }
            background: Rectangle { radius: 8; color: "#0f0e17"; border.color: "#2e2e38" }
        }
        Button {
            id: createRecordButton
            objectName: "notesSetupCreateRecordButton"
            visible: pickerPanel.showCreateAction
            Layout.preferredHeight: 32
            leftPadding: 10
            rightPadding: 10
            onClicked: pickerPanel.createQuickRecord()
            background: Rectangle {
                radius: 8
                color: pickerPanel.mode === "habito" && pickerPanel.selectedHabitIndex === pickerPanel.filteredListItems.length
                    ? "#338b5cf6" : "#7c3aed"
                border.color: pickerPanel.mode === "habito" && pickerPanel.selectedHabitIndex === pickerPanel.filteredListItems.length
                    ? "#8b5cf6" : "transparent"
            }
            contentItem: Text { text: qsTr("+ Criar"); color: "#fff"; font.pixelSize: 11 }
        }
    }

    Text {
        objectName: "notesSetupQuickCreateError"
        visible: pickerPanel.errorMessage.length > 0
        text: pickerPanel.errorMessage
        color: "#fda4af"
        font.pixelSize: 11
        wrapMode: Text.WordWrap
        Layout.fillWidth: true
    }

    Text {
        objectName: "notesSetupHabitEmptyState"
        visible: pickerPanel.showHabitEmptyState
        text: qsTr("Nenhum hábito cadastrado. Digite um nome para criar.")
        color: "#a7a9be"
        font.pixelSize: 12
        horizontalAlignment: Text.AlignHCenter
        Layout.fillWidth: true
    }

    RowLayout {
        objectName: "notesSetupHabitKeyboardHelp"
        visible: pickerPanel.mode === "habito"
        Layout.fillWidth: true
        Text {
            Layout.fillWidth: true
            text: qsTr("Navegue com ↑ ↓ e pressione Enter")
            color: "#74778d"
            font.pixelSize: 10
        }
        Text {
            text: qsTr("Esc para fechar")
            color: "#74778d"
            font.pixelSize: 10
        }
    }

    ScrollView {
        visible: pickerPanel.mode === "question" || pickerPanel.mode === "habito"
        Layout.fillWidth: true
        Layout.preferredHeight: 220
        clip: true

        ColumnLayout {
            width: parent.width
            spacing: 6
            Button {
                visible: pickerPanel.mode === "habito"
                Layout.fillWidth: true
                Layout.preferredHeight: 36
                onClicked: {
                    pickerPanel.insertWidgetRequested("<span data-type=\"habit-widget\" data-habit-id=\"all\"></span>")
                    pickerPanel.closeRequested()
                }
                background: Rectangle { radius: 8; color: "#2210b981"; border.color: "#4410b981" }
                contentItem: Text { text: qsTr("Todos os hábitos do dia"); color: "#6ee7b7"; font.pixelSize: 12; font.bold: true }
            }
            Repeater {
                model: pickerPanel.filteredListItems
                delegate: Button {
                    id: eventItemButton
                    objectName: "notesSetupPickerItem"
                    required property var modelData
                    required property int index
                    Layout.fillWidth: true
                    Layout.preferredHeight: 40
                    onHoveredChanged: if (hovered && eventItemButton.modelData.__picker.mode === "habito")
                        eventItemButton.modelData.__picker.selectedHabitIndex = index
                    onClicked: eventItemButton.modelData.__picker.insertPickedItem(eventItemButton.modelData)
                    background: Rectangle {
                        radius: 8
                        color: eventItemButton.modelData.__picker.mode === "habito" &&
                            eventItemButton.modelData.__picker.selectedHabitIndex === eventItemButton.index
                            ? "#1a10b981" : eventItemButton.hovered ? "#228b5cf6" : "#1d1c2e"
                        border.color: eventItemButton.modelData.__picker.mode === "habito" &&
                            eventItemButton.modelData.__picker.selectedHabitIndex === eventItemButton.index
                            ? "#4d10b981" : "#15ffffff"
                    }
                    contentItem: Text {
                        text: eventItemButton.modelData.title || eventItemButton.modelData.label ||
                            (eventItemButton.modelData.time || "")
                        color: "#fffffe"
                        font.pixelSize: 12
                        elide: Text.ElideRight
                    }
                }
            }
        }
    }
}
