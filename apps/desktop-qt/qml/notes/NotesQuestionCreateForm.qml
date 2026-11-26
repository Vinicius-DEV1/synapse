pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import QtQuick.Shapes 2.15
import "NotesHtmlEscaping.js" as HtmlEscaping
import "../ui"

ColumnLayout {
    id: questionForm

    property var controller: null
    property string pageId: ""
    property var listItems: []
    property string searchFilter: ""
    property string errorMessage: ""
    readonly property int resultsViewportHeight: filteredBatteries.length === 0
        ? 80 : Math.min(220, filteredBatteries.length * 48)
    readonly property var filteredBatteries: {
        var query = searchFilter.trim().toLowerCase()
        return listItems.filter(function(item) {
            return String(item.title || "").toLowerCase().indexOf(query) >= 0
        })
    }

    signal filterEdited(string value)
    signal insertWidgetRequested(string html)
    signal closeRequested()

    spacing: 16

    function focusTitleField() {
        titleField.forceActiveFocus()
    }

    function insertBattery(item) {
        var title = HtmlEscaping.escapeHtmlAttribute(item.title || "Bateria")
        var batteryId = HtmlEscaping.escapeHtmlAttribute(item.id || "")
        if (!batteryId) return
        insertWidgetRequested(
            "<div class=\"question-block\" data-type=\"question-block\" data-battery-id=\"" +
            batteryId + "\" data-cached-title=\"" + title + "\" data-title=\"" + title + "\"></div>")
        closeRequested()
    }

    function createBattery() {
        var title = searchFilter.trim()
        if (!title) return
        errorMessage = ""
        var c = questionForm.controller
        if (!c || typeof c.createNoteQuizBattery !== "function") {
            errorMessage = qsTr("Não foi possível criar ou vincular a bateria à página atual.")
            return
        }
        var batteryId = c.createNoteQuizBattery(title, "", pageId)
        if (!batteryId) {
            errorMessage = qsTr("Não foi possível criar ou vincular a bateria à página atual.")
            return
        }
        var safeId = HtmlEscaping.escapeHtmlAttribute(batteryId)
        var safeTitle = HtmlEscaping.escapeHtmlAttribute(title)
        insertWidgetRequested(
            "<div class=\"question-block\" data-type=\"question-block\" data-battery-id=\"" +
            safeId + "\" data-cached-title=\"" + safeTitle + "\" data-title=\"" + safeTitle + "\"></div>")
        closeRequested()
    }

    Item {
        Layout.fillWidth: true
        Layout.preferredHeight: 48

        TextField {
            id: titleField
            objectName: "notesQuestionTitleField"
            anchors.fill: parent
            rightPadding: 52
            text: questionForm.searchFilter
            placeholderText: qsTr("Nome da bateria (ex: Revisão de História)")
            color: "#fffffe"
            font.pixelSize: 13
            onTextEdited: {
                questionForm.errorMessage = ""
                questionForm.filterEdited(text)
            }
            onAccepted: questionForm.createBattery()
            background: Rectangle {
                radius: 12
                color: "#66000000"
                border.color: titleField.activeFocus ? "#807c3aed" : "#1affffff"
            }
        }

        Button {
            id: createBatteryButton
            objectName: "notesQuestionCreateButton"
            anchors.right: parent.right
            anchors.rightMargin: 8
            anchors.verticalCenter: parent.verticalCenter
            width: 32
            height: 32
            enabled: questionForm.searchFilter.trim().length > 0
            onClicked: questionForm.createBattery()
            background: Rectangle {
                radius: 8
                color: createBatteryButton.enabled
                    ? createBatteryButton.hovered ? "#8b5cf6" : "#7c3aed"
                    : "#807c3aed"
            }
            contentItem: AppIcon {
                anchors.centerIn: parent
                name: "plus"
                color: "#ffffff"
                width: 16
                height: 16
                strokeWidth: 2
            }
        }
    }

    Text {
        objectName: "notesQuestionCreateError"
        visible: questionForm.errorMessage.length > 0
        text: questionForm.errorMessage
        color: "#fda4af"
        font.pixelSize: 11
        wrapMode: Text.WordWrap
        Layout.fillWidth: true
    }

    Text {
        objectName: "notesQuestionExistingHeading"
        text: qsTr("Widgets Existentes no App")
        color: "#66ffffff"
        font.pixelSize: 11
        font.weight: Font.Medium
        font.capitalization: Font.AllUppercase
        Layout.fillWidth: true
    }

    Flickable {
        id: questionResultsViewport
        objectName: "notesQuestionResultsViewport"
        Layout.fillWidth: true
        Layout.preferredHeight: questionForm.resultsViewportHeight
        clip: true
        contentWidth: width
        contentHeight: resultColumn.implicitHeight
        boundsBehavior: Flickable.StopAtBounds
        ScrollBar.vertical: ScrollBar {}

        ColumnLayout {
            id: resultColumn
            width: questionResultsViewport.width
            spacing: 4

            Rectangle {
                id: questionEmptyState
                objectName: "notesQuestionEmptyState"
                visible: questionForm.filteredBatteries.length === 0
                Layout.fillWidth: true
                Layout.preferredHeight: 80
                radius: 12
                color: "#33000000"

                Shape {
                    anchors.fill: parent
                    ShapePath {
                        strokeColor: "#1affffff"
                        strokeWidth: 1
                        strokeStyle: ShapePath.DashLine
                        dashPattern: [3, 3]
                        fillColor: "transparent"
                        startX: 12
                        startY: 1
                        PathLine { x: questionEmptyState.width - 12; y: 1 }
                        PathLine { x: questionEmptyState.width - 1; y: questionEmptyState.height / 2 }
                        PathLine { x: questionEmptyState.width - 12; y: questionEmptyState.height - 1 }
                        PathLine { x: 12; y: questionEmptyState.height - 1 }
                        PathLine { x: 1; y: questionEmptyState.height / 2 }
                        PathLine { x: 12; y: 1 }
                    }
                }

                Text {
                    objectName: "notesQuestionEmptyMessage"
                    anchors.fill: parent
                    anchors.margins: 12
                    text: qsTr("Nenhuma bateria encontrada.")
                    color: "#66ffffff"
                    font.pixelSize: 12
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }

            Repeater {
                model: questionForm.filteredBatteries

                delegate: Button {
                    id: batteryItem
                    objectName: "notesQuestionExistingBattery"
                    required property var modelData
                    Layout.fillWidth: true
                    Layout.preferredHeight: 48
                    onClicked: questionForm.insertBattery(modelData)
                    background: Rectangle {
                        radius: 12
                        color: batteryItem.hovered ? "#0dffffff" : "transparent"
                    }
                    contentItem: RowLayout {
                        spacing: 12

                        Rectangle {
                            Layout.preferredWidth: 32
                            Layout.preferredHeight: 32
                            radius: 8
                            color: "#1a7c3aed"
                            border.color: "#337c3aed"
                            AppIcon {
                                anchors.centerIn: parent
                                name: "layers"
                                color: "#a78bfa"
                                width: 14
                                height: 14
                            }
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 2
                            Text {
                                text: batteryItem.modelData.title || qsTr("Bateria sem título")
                                color: "#fffffe"
                                font.pixelSize: 13
                                font.weight: Font.Medium
                                elide: Text.ElideRight
                                Layout.fillWidth: true
                            }
                            Text {
                                readonly property int count: Number(batteryItem.modelData.question_count || 0)
                                text: count === 1 ? qsTr("1 questão") : qsTr("%1 questões").arg(count)
                                color: "#66ffffff"
                                font.pixelSize: 11
                                elide: Text.ElideRight
                                Layout.fillWidth: true
                            }
                        }
                    }
                }
            }
        }
    }
}
