pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15
import "NotesQuizBatteryMentions.js" as BatteryMentions

Rectangle {
    id: composerRoot
    property string inputText: ""
    property var controller: null
    property string activeBatteryId: ""
    property bool isSending: false
    property bool canSend: true
    property var batteries: []
    property var attachedBatteries: []
    property bool showMentionMenu: false
    property string mentionQuery: ""
    property int selectedMentionIndex: 0
    readonly property var filteredBatteries: BatteryMentions.filterBatteries(
        batteries, mentionQuery, attachedBatteries)

    signal inputTextUpdated(string text)
    signal sendRequested(string message, var referencedBatteries)

    Layout.fillWidth: true
    Layout.preferredHeight: composerLayout.implicitHeight + 24
    color: "#241934"
    border.color: "#4c1d95"
    z: 3

    Component.onCompleted: refreshBatteries()
    onControllerChanged: refreshBatteries()
    onActiveBatteryIdChanged: refreshBatteries()

    ColumnLayout {
        id: composerLayout
        anchors.fill: parent
        anchors.margins: 12
        spacing: 8

        Flow {
            Layout.fillWidth: true
            visible: composerRoot.attachedBatteries.length > 0
            spacing: 6
            Repeater {
                model: composerRoot.attachedBatteries
                delegate: Rectangle {
                    id: referenceChip
                    required property var modelData
                    implicitWidth: refLabel.implicitWidth + removeRef.width + 22
                    implicitHeight: 28
                    radius: 8
                    color: "#3b2460"
                    border.color: "#6b4a9e"
                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 8
                        anchors.rightMargin: 4
                        spacing: 5
                        Text {
                            id: refLabel
                            text: "@" + String(referenceChip.modelData.title || "") + " · "
                                + String(referenceChip.modelData.questionCount || 0) + " q."
                            color: "#e9d5ff"
                            font.pixelSize: 10
                        }
                        Button {
                            id: removeRef
                            text: "×"
                            implicitWidth: 20
                            implicitHeight: 20
                            onClicked: composerRoot.removeReference(String(referenceChip.modelData.id))
                        }
                    }
                }
            }
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: 8
            TextArea {
                id: chatInput
                objectName: "notesQuizAssistantInput"
                Layout.fillWidth: true
                Layout.preferredHeight: Math.min(140, Math.max(42, contentHeight + 18))
                text: composerRoot.inputText
                placeholderText: qsTr("Digite seu pedido... (Shift+Enter para nova linha, @ para referenciar outra bateria)")
                color: "#f3e8ff"
                placeholderTextColor: "#7c7089"
                font.pixelSize: 12
                wrapMode: TextEdit.Wrap
                padding: 12
                background: Rectangle {
                    color: "#0c0a12"
                    radius: 12
                    border.color: chatInput.activeFocus ? "#8b5cf6" : "#4c1d95"
                }
                onTextChanged: {
                    composerRoot.inputText = text
                    composerRoot.inputTextUpdated(text)
                    composerRoot.updateMentionQuery()
                }
                Keys.onReturnPressed: function(event) {
                    if (composerRoot.selectMentionOnEnter(event)) return
                    if (!(event.modifiers & Qt.ShiftModifier)) {
                        event.accepted = true
                        composerRoot.submit()
                    }
                }
                Keys.onEnterPressed: function(event) {
                    if (composerRoot.selectMentionOnEnter(event)) return
                    if (!(event.modifiers & Qt.ShiftModifier)) {
                        event.accepted = true
                        composerRoot.submit()
                    }
                }
                Keys.onTabPressed: function(event) {
                    if (composerRoot.showMentionMenu && composerRoot.filteredBatteries.length > 0) {
                        event.accepted = true
                        composerRoot.selectBattery(composerRoot.selectedMentionIndex)
                    }
                }
                Keys.onUpPressed: function(event) {
                    if (!composerRoot.showMentionMenu || composerRoot.filteredBatteries.length === 0) return
                    event.accepted = true
                    composerRoot.moveMentionSelection(-1)
                }
                Keys.onDownPressed: function(event) {
                    if (!composerRoot.showMentionMenu || composerRoot.filteredBatteries.length === 0) return
                    event.accepted = true
                    composerRoot.moveMentionSelection(1)
                }
                Keys.onEscapePressed: function(event) {
                    if (!composerRoot.showMentionMenu) return
                    event.accepted = true
                    composerRoot.dismissMentionMenu()
                }
            }
            Button {
                text: "@"
                enabled: !composerRoot.isSending
                Layout.preferredWidth: 38
                Layout.preferredHeight: 42
                onClicked: {
                    composerRoot.showMentionMenu = !composerRoot.showMentionMenu
                    composerRoot.mentionQuery = ""
                    chatInput.forceActiveFocus()
                }
            }
            Button {
                text: composerRoot.isSending ? "◌" : qsTr("Enviar")
                enabled: composerRoot.canSend && !composerRoot.isSending && composerRoot.inputText.trim().length > 0
                Layout.preferredWidth: 96
                Layout.preferredHeight: 42
                onClicked: composerRoot.submit()
            }
        }
    }

    Rectangle {
        id: mentionMenu
        x: 16
        y: -height - 8
        width: Math.max(0, composerRoot.width - 32)
        height: Math.min(228, Math.max(68, mentionContent.implicitHeight + 12))
        visible: composerRoot.showMentionMenu
        z: 20
        radius: 14
        color: "#201b2c"
        border.color: "#6b4a9e"
        clip: true

        ColumnLayout {
            id: mentionContent
            anchors.fill: parent
            spacing: 0
            Rectangle {
                Layout.fillWidth: true
                Layout.preferredHeight: 34
                color: "#2b1a43"
                Text {
                    anchors.verticalCenter: parent.verticalCenter
                    anchors.left: parent.left
                    anchors.leftMargin: 12
                    text: qsTr("Referenciar bateria · ↑ ↓ e Enter para selecionar")
                    color: "#c4b5fd"
                    font.pixelSize: 10
                }
            }
            Text {
                visible: composerRoot.filteredBatteries.length === 0
                Layout.fillWidth: true
                Layout.preferredHeight: 56
                text: composerRoot.mentionQuery.length > 0
                    ? qsTr("Nenhuma bateria encontrada para “%1”.").arg(composerRoot.mentionQuery)
                    : qsTr("Nenhuma outra bateria disponível.")
                color: "#a1a1aa"
                font.pixelSize: 11
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            Repeater {
                model: composerRoot.filteredBatteries
                delegate: ItemDelegate {
                    id: mentionDelegate
                    required property var modelData
                    required property int index
                    Layout.fillWidth: true
                    implicitHeight: 46
                    highlighted: index === composerRoot.selectedMentionIndex
                    contentItem: RowLayout {
                        spacing: 10
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 2
                            Text {
                                Layout.fillWidth: true
                                text: String(mentionDelegate.modelData.title || "")
                                color: "#f3e8ff"
                                font.pixelSize: 11
                                elide: Text.ElideRight
                            }
                            Text {
                                Layout.fillWidth: true
                                text: String(mentionDelegate.modelData.pageTitle || "")
                                color: "#a1a1aa"
                                font.pixelSize: 9
                                elide: Text.ElideRight
                            }
                        }
                        Text {
                            text: String(mentionDelegate.modelData.questionCount || 0) + " q."
                            color: "#c4b5fd"
                            font.pixelSize: 10
                        }
                    }
                    onClicked: composerRoot.selectBattery(index)
                }
            }
        }
    }

    function refreshBatteries() {
        if (!controller || typeof controller.getQuizBatteries !== "function") {
            batteries = []
            return
        }
        batteries = BatteryMentions.normalizeBatteries(controller.getQuizBatteries(), activeBatteryId)
    }

    function updateMentionQuery() {
        var query = BatteryMentions.mentionQuery(inputText)
        showMentionMenu = query !== null
        mentionQuery = query === null ? "" : query
        selectedMentionIndex = 0
    }

    function selectMentionOnEnter(event) {
        if (!showMentionMenu || filteredBatteries.length === 0) return false
        event.accepted = true
        selectBattery(selectedMentionIndex)
        return true
    }

    function moveMentionSelection(direction) {
        var count = filteredBatteries.length
        if (!showMentionMenu || count === 0) return
        selectedMentionIndex = (selectedMentionIndex + direction + count) % count
    }

    function dismissMentionMenu() {
        showMentionMenu = false
    }

    function selectBattery(index) {
        var battery = filteredBatteries[index]
        if (!battery) return
        attachedBatteries = attachedBatteries.concat([BatteryMentions.attachBattery(controller, battery)])
        inputText = BatteryMentions.removeMention(inputText)
        inputTextUpdated(inputText)
        showMentionMenu = false
        mentionQuery = ""
        chatInput.forceActiveFocus()
    }

    function removeReference(batteryId) { attachedBatteries = attachedBatteries.filter(function(item) { return item.id !== batteryId }) }

    function submit(overrideText) {
        var message = String(overrideText !== undefined ? overrideText : inputText).trim()
        if (!message || !canSend || isSending) return
        sendRequested(message, attachedBatteries)
        inputText = ""
        inputTextUpdated("")
    }

    function clearReferences() { attachedBatteries = []; showMentionMenu = false; mentionQuery = "" }
}
