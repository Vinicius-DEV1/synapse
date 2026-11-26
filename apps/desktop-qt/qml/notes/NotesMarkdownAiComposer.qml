import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Item {
    id: root
    objectName: "notesMarkdownAiComposer"

    property string promptText: ""
    property string mentionQuery: ""
    property bool showMentionMenu: false
    property bool busy: false
    property int selectedMentionIndex: 0
    property var attachedBatteries: []
    property var filteredBatteries: []

    signal promptEdited(string value)
    signal promptSubmitted()
    signal batterySelected(string batteryId)
    signal batteryRemoved(string batteryId)
    signal mentionSelectionChanged(int index)
    signal mentionMenuDismissed()

    implicitHeight: contentColumn.implicitHeight

    function focusInput() { promptInput.forceActiveFocus() }

    ColumnLayout {
        id: contentColumn
        anchors.fill: parent
        spacing: 8

        Flow {
            objectName: "notesMarkdownAiAttachedBatteries"
            Layout.fillWidth: true
            visible: root.attachedBatteries.length > 0
            spacing: 6
            Repeater {
                model: root.attachedBatteries
                delegate: Rectangle {
                    required property var modelData
                    height: 28
                    width: batteryChipRow.implicitWidth + 16
                    radius: 8
                    color: "#1f1e2e"
                    border.color: "#558b5cf6"
                    RowLayout {
                        id: batteryChipRow
                        anchors.centerIn: parent
                        spacing: 5
                        AppIcon { name: "layers"; color: "#a78bfa"; width: 12; height: 12 }
                        Label { text: "@" + modelData.title; color: "#ddd6fe"; font.pixelSize: 10; elide: Text.ElideRight; Layout.maximumWidth: 190 }
                        Label { text: "(" + modelData.questionCount + ")"; color: "#a7a9be"; font.pixelSize: 9 }
                        ToolButton {
                            objectName: "notesMarkdownAiRemoveBatteryButton"
                            Accessible.name: qsTr("Remover bateria %1").arg(modelData.title)
                            implicitWidth: 18; implicitHeight: 18
                            onClicked: root.batteryRemoved(String(modelData.id))
                            contentItem: AppIcon { name: "close"; color: "#a7a9be"; width: 11; height: 11 }
                        }
                    }
                }
            }
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: 8
            TextField {
                id: promptInput
                objectName: "notesMarkdownAiPromptInput"
                Layout.fillWidth: true
                enabled: !root.busy
                text: root.promptText
                placeholderText: qsTr("Peça à IA para editar o texto ou digite @ para marcar uma bateria de questões…")
                color: "#fffffe"
                font.pixelSize: 12
                onTextEdited: root.promptEdited(text)
                onAccepted: root.promptSubmitted()
                Keys.onPressed: function(event) {
                    if (event.key === Qt.Key_Escape && root.showMentionMenu) {
                        root.mentionMenuDismissed()
                        event.accepted = true
                        return
                    }
                    if (!root.showMentionMenu || root.filteredBatteries.length === 0) return
                    if (event.key === Qt.Key_Down) {
                        root.mentionSelectionChanged((root.selectedMentionIndex + 1) % root.filteredBatteries.length)
                        event.accepted = true
                    } else if (event.key === Qt.Key_Up) {
                        root.mentionSelectionChanged((root.selectedMentionIndex - 1 + root.filteredBatteries.length) % root.filteredBatteries.length)
                        event.accepted = true
                    } else if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter || event.key === Qt.Key_Tab) {
                        var index = Math.max(0, Math.min(root.selectedMentionIndex, root.filteredBatteries.length - 1))
                        root.batterySelected(String(root.filteredBatteries[index].id))
                        event.accepted = true
                    }
                }
            }
            Button {
                objectName: "notesMarkdownAiSendButton"
                text: qsTr("Enviar")
                enabled: promptInput.text.trim().length > 0 && !root.busy
                highlighted: true
                onClicked: root.promptSubmitted()
            }
        }
    }

    Popup {
        id: batteryPopup
        objectName: "notesMarkdownAiBatteryMentionMenu"
        parent: Overlay.overlay
        x: Math.max(12, Math.min(root.mapToItem(Overlay.overlay, 0, 0).x,
                                 Overlay.overlay ? Overlay.overlay.width - width - 12 : 12))
        y: Math.max(8, root.mapToItem(Overlay.overlay, 0, 0).y - height - 8)
        width: Math.min(440, Overlay.overlay ? Overlay.overlay.width - 24 : 440)
        height: Math.min(240, Math.max(82, batteryMenuColumn.implicitHeight))
        padding: 0
        modal: false
        focus: false
        closePolicy: Popup.NoAutoClose
        visible: root.showMentionMenu
        background: Rectangle { color: "#1a1924"; radius: 11; border.color: "#668b5cf6" }
        contentItem: ColumnLayout {
            id: batteryMenuColumn
            spacing: 0
            Label {
                Layout.fillWidth: true
                leftPadding: 12; rightPadding: 12; topPadding: 9; bottomPadding: 9
                text: qsTr("Baterias de Questões Disponíveis")
                color: "#a78bfa"; font.pixelSize: 11; font.bold: true
            }
            Rectangle { Layout.fillWidth: true; height: 1; color: "#14ffffff" }
            ListView {
                id: batteryMenuList
                objectName: "notesMarkdownAiBatteryMentionList"
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true
                model: root.filteredBatteries
                delegate: Button {
                    required property var modelData
                    required property int index
                    width: batteryMenuList.width
                    height: 44
                    onClicked: root.batterySelected(String(modelData.id))
                    background: Rectangle {
                        color: index === root.selectedMentionIndex ? "#338b5cf6" : parent.hovered ? "#0dffffff" : "transparent"
                    }
                    contentItem: RowLayout {
                        spacing: 8
                        AppIcon { name: "layers"; color: "#a78bfa"; width: 14; height: 14 }
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 1
                            Label { text: modelData.title; color: "#fffffe"; font.pixelSize: 11; elide: Text.ElideRight }
                            Label { text: qsTr("Página: %1").arg(modelData.pageTitle); color: "#a7a9be"; font.pixelSize: 9; elide: Text.ElideRight }
                        }
                        Label { text: qsTr("%1 questões").arg(modelData.questionCount); color: "#a7a9be"; font.pixelSize: 9 }
                    }
                }
            }
            Label {
                Layout.fillWidth: true
                visible: root.filteredBatteries.length === 0
                leftPadding: 12; rightPadding: 12; topPadding: 12; bottomPadding: 12
                text: qsTr("Nenhuma bateria encontrada com ‘%1’").arg(root.mentionQuery)
                color: "#a7a9be"; font.pixelSize: 11
                horizontalAlignment: Text.AlignHCenter
            }
        }
    }
}
