import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: qBlockRoot
    Layout.fillWidth: true
    implicitHeight: mainCol.implicitHeight + 12
    radius: 12
    color: hoverHandler.hovered ? "#0affffff" : "#801a1924"
    border.color: hoverHandler.hovered ? "#4d8b5cf6" : "#0dffffff"
    border.width: 1
    Behavior on color { ColorAnimation { duration: 150 } }
    Behavior on border.color { ColorAnimation { duration: 150 } }

    property var blockData: ({})
    property var controller: null
    property string pageId: ""
    property var attrs: blockData.attrs || ({})
    property string batteryId: (attrs["data-battery-id"] || attrs["battery-id"] || attrs["batteryId"] || "")
    property string questionId: (attrs["data-question-id"] || attrs["question-id"] || attrs["questionId"] || "")
    property string cachedTitle: attrs["data-cached-title"] || attrs["data-title"] || attrs["cachedTitle"] || attrs["title"] || qsTr("Bateria de Exercícios")
    property string description: attrs["data-description"] || attrs["description"] || ""
    property int cachedCount: parseInt(attrs["data-cached-count"] || attrs["cachedCount"] || "0", 10) || 0
    property var cachedTags: {
        var raw = attrs["data-cached-tags"] || attrs["cachedTags"] || "[]"
        try {
            var parsed = typeof raw === "string" ? JSON.parse(raw) : raw
            return Array.isArray(parsed) ? parsed : []
        } catch (e) {
            return []
        }
    }
    property bool expanded: false
    property bool componentReady: false
    property var batteryInfo: null
    property var questionList: []

    signal playRequested(string batteryId, string questionId, string title)
    signal openInQuestionsRequested(string batteryId)
    signal removeRequested()

    NotesQuestionBlockDeleteDialog {
        id: deleteConfirmDialog
        onConfirmed: qBlockRoot.removeRequested()
    }

    HoverHandler { id: hoverHandler }

    function refreshFromCore() {
        var c = qBlockRoot.controller || (typeof dataController !== "undefined" ? dataController : null)
        if (!c) return
        batteryInfo = batteryId.length > 0 && typeof c.getQuizBattery === "function"
            ? c.getQuizBattery(batteryId) : null
        if (batteryInfo && batteryInfo.id) {
            cachedTitle = batteryInfo.title || cachedTitle
            if (batteryInfo.description && description.length === 0)
                description = batteryInfo.description
        }
        questionList = []
        var inlineRaw = attrs["data-questions"] || attrs["questions"] || ""
        if (inlineRaw.length > 0) {
            try {
                var parsed = JSON.parse(inlineRaw.indexOf("%") >= 0 ? decodeURIComponent(inlineRaw) : inlineRaw)
                if (Array.isArray(parsed)) questionList = parsed
            } catch (e) {
                console.warn("[QuestionBlock] Failed to parse data-questions:", e)
            }
        }
        if (expanded) loadQuestionPreview()
    }

    function loadQuestionPreview() {
        if (questionList.length > 0) return
        var c = qBlockRoot.controller || (typeof dataController !== "undefined" ? dataController : null)
        if (!c) return
        if (batteryId.length > 0 && typeof c.getBatteryQuestions === "function") {
            questionList = c.getBatteryQuestions(batteryId) || []
        } else if (questionId.length > 0 && typeof c.getQuizQuestion === "function") {
            var question = c.getQuizQuestion(questionId)
            questionList = question && question.id ? [question] : []
        }
    }

    Component.onCompleted: {
        refreshFromCore()
        componentReady = true
    }
    onBlockDataChanged: if (componentReady) refreshFromCore()
    onExpandedChanged: if (expanded) loadQuestionPreview()

    readonly property int totalCount: batteryInfo && batteryInfo.question_count !== undefined
        ? Number(batteryInfo.question_count)
        : (questionList.length > 0 ? questionList.length : cachedCount)
    readonly property int answeredCount: batteryInfo && batteryInfo.answered_count !== undefined
        ? Number(batteryInfo.answered_count) : 0
    readonly property int correctCount: batteryInfo && batteryInfo.correct_count !== undefined
        ? Number(batteryInfo.correct_count) : 0
    readonly property int accuracyPct: answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0

    ColumnLayout {
        id: mainCol
        anchors.fill: parent
        anchors.leftMargin: 12
        anchors.rightMargin: 12
        anchors.topMargin: 6
        anchors.bottomMargin: 6
        spacing: 8

        RowLayout {
            Layout.fillWidth: true
            spacing: 10

            // Icon badge: p-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20
            Rectangle {
                Layout.preferredWidth: 28
                Layout.preferredHeight: 28
                radius: 8
                color: "#1a8b5cf6"
                border.color: "#338b5cf6"
                border.width: 1
                AppIcon {
                    anchors.centerIn: parent
                    name: "check-circle"
                    color: "#a78bfa"
                    width: 15
                    height: 15
                }
            }

            // Title
            Text {
                Layout.fillWidth: true
                Layout.maximumWidth: 280
                text: qBlockRoot.cachedTitle
                color: "#fffffe"
                font.pixelSize: 13
                font.weight: Font.DemiBold
                elide: Text.ElideRight
            }

            // Question count pill (hover-revealed like QuestionBlockCard.tsx)
            Rectangle {
                opacity: hoverHandler.hovered ? 1 : 0
                visible: qBlockRoot.totalCount > 0
                Behavior on opacity { NumberAnimation { duration: 150 } }
                Layout.preferredHeight: 20
                Layout.preferredWidth: Math.max(52, countPillTxt.implicitWidth + 16)
                radius: 10
                color: "#08ffffff"
                border.color: "#10ffffff"
                border.width: 1
                Text {
                    id: countPillTxt
                    anchors.centerIn: parent
                    text: qBlockRoot.totalCount + (qBlockRoot.totalCount === 1 ? " q" : " qs")
                    color: "#a7a9be"
                    font.pixelSize: 10
                    font.family: "monospace"
                }
            }

            // Accuracy indicator
            Text {
                opacity: hoverHandler.hovered ? 1 : 0
                visible: qBlockRoot.answeredCount > 0
                Behavior on opacity { NumberAnimation { duration: 150 } }
                text: qBlockRoot.accuracyPct + "% acertos"
                color: "#e634d399"
                font.pixelSize: 11
                font.family: "monospace"
                font.weight: Font.Medium
            }

            // Tag chips
            RowLayout {
                visible: qBlockRoot.cachedTags.length > 0
                spacing: 4
                Repeater {
                    model: qBlockRoot.cachedTags.slice(0, 2)
                    delegate: Rectangle {
                        required property string modelData
                        Layout.preferredHeight: 20
                        Layout.preferredWidth: tagRow.implicitWidth + 12
                        radius: 6
                        color: "#08ffffff"
                        border.color: "#10ffffff"
                        border.width: 1
                        RowLayout {
                            id: tagRow
                            anchors.centerIn: parent
                            spacing: 3
                            AppIcon { name: "tag"; color: "#b3a7a9be"; width: 9; height: 9 }
                            Text { text: modelData; color: "#a7a9be"; font.pixelSize: 10 }
                        }
                    }
                }
                Text {
                    visible: qBlockRoot.cachedTags.length > 2
                    text: "+" + (qBlockRoot.cachedTags.length - 2)
                    color: "#b3a7a9be"
                    font.pixelSize: 10
                    font.family: "monospace"
                }
            }

            // Description preview
            Text {
                visible: qBlockRoot.description.length > 0
                Layout.fillWidth: true
                text: "• " + qBlockRoot.description
                color: "#a7a9be"
                font.pixelSize: 12
                elide: Text.ElideRight
            }

            Item { Layout.fillWidth: qBlockRoot.description.length === 0 }

            // Hover-revealed quick actions & Launch Button
            RowLayout {
                opacity: hoverHandler.hovered || qBlockRoot.expanded ? 1 : 0
                Behavior on opacity { NumberAnimation { duration: 150 } }
                spacing: 4

                Button {
                    id: playFocusBtn
                    Layout.preferredHeight: 26
                    leftPadding: 10
                    rightPadding: 10
                    focusPolicy: Qt.NoFocus
                    onClicked: qBlockRoot.playRequested(qBlockRoot.batteryId, qBlockRoot.questionId, qBlockRoot.cachedTitle)
                    background: Rectangle {
                        radius: 8
                        color: playFocusBtn.hovered ? "#4d7c3aed" : "#337c3aed"
                        border.color: playFocusBtn.hovered ? "#808b5cf6" : "#4d8b5cf6"
                        border.width: 1
                    }
                    contentItem: RowLayout {
                        spacing: 6
                        AppIcon { name: "play"; color: "#c4b5fd"; width: 11; height: 11 }
                        Text {
                            text: qsTr("Iniciar no Modo Foco")
                            color: "#c4b5fd"
                            font.pixelSize: 11
                            font.weight: Font.DemiBold
                        }
                    }
                }

                ToolButton {
                    Layout.preferredWidth: 26
                    Layout.preferredHeight: 26
                    visible: qBlockRoot.questionList.length > 0
                    focusPolicy: Qt.NoFocus
                    ToolTip.visible: hovered
                    ToolTip.text: qBlockRoot.expanded ? qsTr("Recolher prévia") : qsTr("Pré-visualizar questões")
                    onClicked: qBlockRoot.expanded = !qBlockRoot.expanded
                    background: Rectangle { radius: 8; color: parent.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon {
                        anchors.centerIn: parent
                        name: qBlockRoot.expanded ? "chevron-down" : "chevron-right"
                        color: parent.hovered ? "#fffffe" : "#a1a1aa"
                        width: 13
                        height: 13
                    }
                }

                ToolButton {
                    Layout.preferredWidth: 26
                    Layout.preferredHeight: 26
                    focusPolicy: Qt.NoFocus
                    ToolTip.visible: hovered
                    ToolTip.text: qsTr("Abrir no Módulo de Questões")
                    onClicked: qBlockRoot.openInQuestionsRequested(qBlockRoot.batteryId)
                    background: Rectangle { radius: 8; color: parent.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon {
                        anchors.centerIn: parent
                        name: "external-link"
                        color: parent.hovered ? "#fffffe" : "#a1a1aa"
                        width: 13
                        height: 13
                    }
                }

                ToolButton {
                    Layout.preferredWidth: 26
                    Layout.preferredHeight: 26
                    focusPolicy: Qt.NoFocus
                    ToolTip.visible: hovered
                    ToolTip.text: qsTr("Editar questões")
                    onClicked: qBlockRoot.openInQuestionsRequested(qBlockRoot.batteryId)
                    background: Rectangle { radius: 8; color: parent.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon {
                        anchors.centerIn: parent
                        name: "edit"
                        color: parent.hovered ? "#fffffe" : "#a1a1aa"
                        width: 13
                        height: 13
                    }
                }

                ToolButton {
                    Layout.preferredWidth: 26
                    Layout.preferredHeight: 26
                    focusPolicy: Qt.NoFocus
                    ToolTip.visible: hovered
                    ToolTip.text: qsTr("Remover bloco da nota")
                    onClicked: deleteConfirmDialog.open()
                    background: Rectangle { radius: 8; color: parent.hovered ? "#1af43f5e" : "transparent" }
                    contentItem: AppIcon {
                        anchors.centerIn: parent
                        name: "trash"
                        color: parent.hovered ? "#fb7185" : "#a1a1aa"
                        width: 13
                        height: 13
                    }
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
                    color: "#15141b"
                    border.color: "#0fffffff"
                    border.width: 1
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
