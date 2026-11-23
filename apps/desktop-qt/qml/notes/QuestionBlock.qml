import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: qBlockRoot
    Layout.fillWidth: true
    implicitHeight: mainCol.implicitHeight + 24
    radius: 12
    color: "#161522"
    border.color: hoverHandler.hovered ? "#408b5cf6" : "#18ffffff"
    border.width: 1

    property var blockData: ({})
    property string pageId: ""
    property string batteryId: (attrs["data-battery-id"] || attrs["battery-id"] || "")
    property string questionId: (attrs["data-question-id"] || attrs["question-id"] || "")
    property var attrs: blockData.attrs || ({})
    property string cachedTitle: attrs["data-cached-title"] || attrs["data-title"] || qsTr("Bateria de Exercícios")
    property bool expanded: false
    property var batteryInfo: null
    property var questionList: []

    signal playRequested(string batteryId, string questionId, string title)
    signal openInQuestionsRequested(string batteryId)
    signal removeRequested()

    HoverHandler { id: hoverHandler }

    function refreshFromCore() {
        if (typeof dataController === "undefined" || !dataController) return
        if (batteryId.length > 0 && typeof dataController.getQuizBatteries === "function") {
            var batteries = dataController.getQuizBatteries() || []
            for (var i = 0; i < batteries.length; i++) {
                if (batteries[i].id === batteryId) {
                    batteryInfo = batteries[i]
                    cachedTitle = batteries[i].title || cachedTitle
                    break
                }
            }
        }
        var inlineRaw = attrs["data-questions"] || ""
        if (inlineRaw.length > 0) {
            try {
                var parsed = JSON.parse(inlineRaw.indexOf("%") >= 0 ? decodeURIComponent(inlineRaw) : inlineRaw)
                if (Array.isArray(parsed)) questionList = parsed
            } catch (e) {
                console.warn("[QuestionBlock] Failed to parse data-questions:", e)
            }
        }
        if (questionList.length === 0 && typeof dataController.getAllQuizQuestions === "function") {
            var allQ = dataController.getAllQuizQuestions() || []
            var matched = []
            for (var j = 0; j < allQ.length; j++) {
                if ((batteryId.length > 0 && allQ[j].battery_id === batteryId) ||
                    (questionId.length > 0 && allQ[j].id === questionId)) {
                    matched.push(allQ[j])
                }
            }
            questionList = matched
        }
    }

    Component.onCompleted: refreshFromCore()
    onBlockDataChanged: refreshFromCore()

    readonly property int totalCount: batteryInfo && batteryInfo.question_count !== undefined
        ? Number(batteryInfo.question_count) : questionList.length
    readonly property int answeredCount: batteryInfo && batteryInfo.answered_count !== undefined
        ? Number(batteryInfo.answered_count) : 0
    readonly property int correctCount: batteryInfo && batteryInfo.correct_count !== undefined
        ? Number(batteryInfo.correct_count) : 0
    readonly property int accuracyPct: answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0

    ColumnLayout {
        id: mainCol
        anchors.fill: parent
        anchors.margins: 12
        spacing: 10

        RowLayout {
            Layout.fillWidth: true
            spacing: 10

            Rectangle {
                Layout.preferredWidth: 34
                Layout.preferredHeight: 34
                radius: 8
                color: "#228b5cf6"
                border.color: "#338b5cf6"
                AppIcon {
                    anchors.centerIn: parent
                    name: "questions"
                    color: "#c4b5fd"
                    width: 17
                    height: 17
                }
            }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2

                Text {
                    Layout.fillWidth: true
                    text: qBlockRoot.cachedTitle
                    color: "#fffffe"
                    font.pixelSize: 13
                    font.weight: Font.DemiBold
                    elide: Text.ElideRight
                }

                Text {
                    Layout.fillWidth: true
                    text: qBlockRoot.totalCount > 0
                        ? (qBlockRoot.totalCount + " questões" +
                           (qBlockRoot.answeredCount > 0
                            ? " • " + qBlockRoot.answeredCount + "/" + qBlockRoot.totalCount + " (" + qBlockRoot.accuracyPct + "%)"
                            : ""))
                        : qsTr("Bloco de exercícios vinculado")
                    color: "#94a1b2"
                    font.pixelSize: 11
                    elide: Text.ElideRight
                }
            }

            Button {
                Layout.preferredHeight: 30
                Layout.preferredWidth: 88
                focusPolicy: Qt.NoFocus
                onClicked: qBlockRoot.playRequested(qBlockRoot.batteryId, qBlockRoot.questionId, qBlockRoot.cachedTitle)
                background: Rectangle {
                    radius: 7
                    color: parent.hovered ? "#7c3aed" : "#6d28d9"
                }
                contentItem: RowLayout {
                    spacing: 5
                    anchors.centerIn: parent
                    AppIcon { name: "play"; color: "#ffffff"; width: 12; height: 12 }
                    Text { text: qsTr("Praticar"); color: "#ffffff"; font.pixelSize: 11; font.weight: Font.DemiBold }
                }
            }

            ToolButton {
                Layout.preferredWidth: 28
                Layout.preferredHeight: 28
                visible: qBlockRoot.questionList.length > 0
                focusPolicy: Qt.NoFocus
                ToolTip.visible: hovered
                ToolTip.text: qBlockRoot.expanded ? qsTr("Recolher prévia") : qsTr("Pré-visualizar questões")
                onClicked: qBlockRoot.expanded = !qBlockRoot.expanded
                background: Rectangle { radius: 6; color: parent.hovered ? "#1affffff" : "transparent" }
                contentItem: AppIcon {
                    anchors.centerIn: parent
                    name: qBlockRoot.expanded ? "chevron-down" : "chevron-right"
                    color: "#a7a9be"
                    width: 14
                    height: 14
                }
            }

            ToolButton {
                Layout.preferredWidth: 28
                Layout.preferredHeight: 28
                visible: qBlockRoot.batteryId.length > 0
                focusPolicy: Qt.NoFocus
                ToolTip.visible: hovered
                ToolTip.text: qsTr("Abrir em Questões")
                onClicked: qBlockRoot.openInQuestionsRequested(qBlockRoot.batteryId)
                background: Rectangle { radius: 6; color: parent.hovered ? "#1affffff" : "transparent" }
                contentItem: AppIcon {
                    anchors.centerIn: parent
                    name: "external-link"
                    color: "#a7a9be"
                    width: 14
                    height: 14
                }
            }

            ToolButton {
                Layout.preferredWidth: 28
                Layout.preferredHeight: 28
                visible: hoverHandler.hovered
                focusPolicy: Qt.NoFocus
                ToolTip.visible: hovered
                ToolTip.text: qsTr("Remover bloco")
                onClicked: qBlockRoot.removeRequested()
                background: Rectangle { radius: 6; color: parent.hovered ? "#22ef4444" : "transparent" }
                contentItem: AppIcon {
                    anchors.centerIn: parent
                    name: "trash"
                    color: parent.hovered ? "#fda4af" : "#71717a"
                    width: 13
                    height: 13
                }
            }
        }

        ColumnLayout {
            Layout.fillWidth: true
            visible: qBlockRoot.expanded && qBlockRoot.questionList.length > 0
            spacing: 6

            Repeater {
                model: qBlockRoot.questionList.slice(0, 5)
                delegate: Rectangle {
                    required property var modelData
                    required property int index
                    Layout.fillWidth: true
                    implicitHeight: qText.implicitHeight + 14
                    radius: 8
                    color: "#1e1d2e"
                    border.color: "#0fffffff"
                    Text {
                        id: qText
                        anchors.fill: parent
                        anchors.margins: 7
                        text: (index + 1) + ". " + (modelData.prompt || modelData.question || "")
                        color: "#e2e8f0"
                        font.pixelSize: 12
                        wrapMode: Text.WordWrap
                    }
                }
            }
        }
    }
}
