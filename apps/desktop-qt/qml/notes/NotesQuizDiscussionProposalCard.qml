pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: cardRoot
    property var action: ({})
    property bool busy: false
    signal applyRequested(string actionId)
    signal rejectRequested(string actionId)

    readonly property string actionName: action.actionType === "create" ? qsTr("Nova questão")
        : action.actionType === "edit" ? qsTr("Editar questão")
        : action.actionType === "delete" ? qsTr("Excluir questão") : qsTr("Reordenar questões")
    readonly property string targetName: String(action.targetQuestionText || "")
    readonly property bool pending: action.status === "pending"

    width: parent ? parent.width : 400
    implicitHeight: cardLayout.implicitHeight + 24
    radius: 12
    color: action.valid === false ? "#2a171c" : "#171522"
    border.color: action.valid === false ? "#71333b" : "#3f3454"

    ColumnLayout {
        id: cardLayout
        anchors.fill: parent
        anchors.margins: 12
        spacing: 8
        RowLayout {
            Layout.fillWidth: true
            Text {
                Layout.fillWidth: true
                text: cardRoot.actionName
                color: "#e9d5ff"
                font.pixelSize: 12
                font.bold: true
                wrapMode: Text.Wrap
            }
            Text {
                visible: cardRoot.action.factCheckVerdict !== ""
                text: String(cardRoot.action.factCheckVerdict || "") === "corrected"
                    ? qsTr("Revisada") : qsTr("Verificada")
                color: "#a7f3d0"
                font.pixelSize: 10
            }
        }
        Text {
            Layout.fillWidth: true
            visible: cardRoot.targetName.length > 0
            text: qsTr("Alvo: ") + cardRoot.targetName
            color: "#c4b5fd"
            font.pixelSize: 11
            wrapMode: Text.Wrap
        }
        Text {
            Layout.fillWidth: true
            visible: cardRoot.action.actionType === "create" || cardRoot.action.actionType === "edit"
            text: String(cardRoot.action.question || (cardRoot.action.changes && cardRoot.action.changes.question) || "")
            color: "#f4f4f5"
            font.pixelSize: 12
            wrapMode: Text.Wrap
        }
        Repeater {
            model: cardRoot.action.actionType === "create" ? (cardRoot.action.options || [])
                : (cardRoot.action.changes && cardRoot.action.changes.options || [])
            delegate: Text {
                required property var modelData
                required property int index
                Layout.fillWidth: true
                property int correctOptionIndex: cardRoot.action.actionType === "create"
                    ? Number(cardRoot.action.correctIndex)
                    : Number(cardRoot.action.changes && cardRoot.action.changes.correctIndex !== undefined
                        ? cardRoot.action.changes.correctIndex : cardRoot.action.targetQuestionCorrectIndex)
                text: (index === correctOptionIndex ? "✓ " : "• ") + String(modelData)
                color: index === correctOptionIndex ? "#a7f3d0" : "#cbd5e1"
                font.pixelSize: 11
                wrapMode: Text.Wrap
            }
        }
        Text {
            Layout.fillWidth: true
            visible: Boolean(cardRoot.action.explanation || (cardRoot.action.changes && cardRoot.action.changes.explanation))
            text: String(cardRoot.action.explanation || (cardRoot.action.changes ? cardRoot.action.changes.explanation : ""))
            color: "#cbd5e1"
            font.pixelSize: 11
            wrapMode: Text.Wrap
        }
        Text {
            Layout.fillWidth: true
            visible: (cardRoot.action.tags || (cardRoot.action.changes && cardRoot.action.changes.tags) || []).length > 0
            text: qsTr("Etiquetas: ") + ((cardRoot.action.tags || (cardRoot.action.changes && cardRoot.action.changes.tags) || []).join(" · "))
            color: "#a1a1aa"
            font.pixelSize: 10
            wrapMode: Text.Wrap
        }
        Text {
            Layout.fillWidth: true
            visible: cardRoot.action.actionType === "reorder"
            text: (cardRoot.action.orderLabels || []).join(" → ")
            color: "#cbd5e1"
            font.pixelSize: 11
            wrapMode: Text.Wrap
        }
        Text {
            Layout.fillWidth: true
            visible: Boolean(cardRoot.action.expectedAnswer || (cardRoot.action.changes && cardRoot.action.changes.expectedAnswer))
            text: qsTr("Gabarito: ") + String(cardRoot.action.expectedAnswer
                || (cardRoot.action.changes ? cardRoot.action.changes.expectedAnswer : ""))
            color: "#cbd5e1"
            font.pixelSize: 11
            wrapMode: Text.Wrap
        }
        Text {
            Layout.fillWidth: true
            visible: String(cardRoot.action.reason || "").length > 0
            text: String(cardRoot.action.reason)
            color: "#a1a1aa"
            font.pixelSize: 10
            wrapMode: Text.Wrap
        }
        Text {
            Layout.fillWidth: true
            visible: cardRoot.action.valid === false
            text: String(cardRoot.action.validationError || qsTr("Esta sugestão precisa de revisão."))
            color: "#fda4af"
            font.pixelSize: 10
            wrapMode: Text.Wrap
        }
        Text {
            Layout.fillWidth: true
            visible: String(cardRoot.action.applyError || "").length > 0
            text: String(cardRoot.action.applyError)
            color: "#fda4af"
            font.pixelSize: 10
            wrapMode: Text.Wrap
        }
        RowLayout {
            Layout.fillWidth: true
            visible: cardRoot.pending
            Item { Layout.fillWidth: true }
            Button {
                text: qsTr("Rejeitar")
                enabled: !cardRoot.busy
                onClicked: cardRoot.rejectRequested(String(cardRoot.action.id || ""))
            }
            Button {
                text: cardRoot.busy ? qsTr("Salvando...") : qsTr("Aplicar")
                enabled: !cardRoot.busy && cardRoot.action.valid !== false
                onClicked: cardRoot.applyRequested(String(cardRoot.action.id || ""))
            }
        }
        Text {
            Layout.fillWidth: true
            visible: !cardRoot.pending
            text: cardRoot.action.status === "accepted" ? qsTr("Aplicada") : qsTr("Rejeitada")
            color: cardRoot.action.status === "accepted" ? "#86efac" : "#a1a1aa"
            font.pixelSize: 10
        }
    }
}
