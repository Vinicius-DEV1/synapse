pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

ColumnLayout {
    id: listRoot
    property var actions: []
    property bool busy: false
    signal applyRequested(string actionId)
    signal rejectRequested(string actionId)
    signal applyAllRequested()
    signal rejectAllRequested()

    spacing: 8
    RowLayout {
        Layout.fillWidth: true
        Text {
            Layout.fillWidth: true
            text: qsTr("Sugestões de alteração")
            color: "#ddd6fe"
            font.pixelSize: 12
            font.bold: true
        }
        Button {
            visible: listRoot.actions.some(function(action) { return action.status === "pending" })
            text: qsTr("Aplicar válidas")
            enabled: !listRoot.busy && listRoot.actions.some(function(action) {
                return action.status === "pending" && action.valid !== false
            })
            onClicked: listRoot.applyAllRequested()
        }
        Button {
            visible: listRoot.actions.some(function(action) { return action.status === "pending" })
            text: qsTr("Rejeitar todas")
            enabled: !listRoot.busy
            onClicked: listRoot.rejectAllRequested()
        }
    }
    Repeater {
        model: listRoot.actions
        delegate: NotesQuizDiscussionProposalCard {
            required property var modelData
            Layout.fillWidth: true
            action: modelData
            busy: listRoot.busy
            onApplyRequested: function(id) { listRoot.applyRequested(id) }
            onRejectRequested: function(id) { listRoot.rejectRequested(id) }
        }
    }
}
