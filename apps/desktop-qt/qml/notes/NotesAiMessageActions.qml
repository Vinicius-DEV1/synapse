import QtQuick 2.15
import QtQuick.Controls 2.15
import "../ui"

Flow {
    id: actionsRoot
    objectName: "notesAiMessageActions"

    property var message: null
    property var proposal: null
    property string proposalDiff: ""
    property int messageIndex: -1
    property string blockType: ""
    property int diffMessageIndex: -1
    property int copiedMessageIndex: -1
    property bool isGenerating: false

    signal applyRequested(var message, bool isValid)
    signal diffToggled(int messageIndex)
    signal insertRequested(var message, string cleanText, bool isSearchReplace)
    signal copyRequested(var message, int messageIndex, string cleanText)

    spacing: 4

    Button {
        id: applyButton
        objectName: "notesAiApplyMessage"
        visible: Boolean(actionsRoot.proposal)
        enabled: !actionsRoot.isGenerating
        hoverEnabled: true
        padding: 2
        leftPadding: 8
        rightPadding: 8
        ToolTip.visible: hovered
        ToolTip.text: actionsRoot.proposal && actionsRoot.proposal.isSearchReplace
            ? qsTr("Aplicar cirurgicamente (%1 alteração(ões))").arg(actionsRoot.proposal.searchReplaceCount)
            : actionsRoot.blockType === "codeBlock" ? qsTr("Substituir código atual") : qsTr("Substituir conteúdo do bloco")
        onClicked: actionsRoot.applyRequested(actionsRoot.message, Boolean(actionsRoot.proposal.valid))
        background: Rectangle {
            radius: 4
            color: actionsRoot.proposal && actionsRoot.proposal.isSearchReplace
                ? (applyButton.hovered ? "#6610b981" : "#3310b981")
                : (applyButton.hovered ? "#668b5cf6" : "#338b5cf6")
            border.color: actionsRoot.proposal && actionsRoot.proposal.isSearchReplace ? "#4d10b981" : "#4d8b5cf6"
            Behavior on color { ColorAnimation { duration: 120 } }
        }
        contentItem: Row {
            anchors.centerIn: parent
            spacing: 4
            AppIcon {
                name: actionsRoot.proposal && actionsRoot.proposal.isSearchReplace ? "sparkles" : "check"
                color: applyButton.hovered ? "#ffffff"
                    : actionsRoot.proposal && actionsRoot.proposal.isSearchReplace ? "#6ee7b7" : "#c4b5fd"
                width: 11
                height: 11
            }
            Text {
                objectName: "notesAiApplyMessageLabel"
                text: actionsRoot.proposal && actionsRoot.proposal.isSearchReplace
                    ? qsTr("Aplicar Cirurgicamente (%1)").arg(actionsRoot.proposal.searchReplaceCount)
                    : actionsRoot.blockType === "codeBlock" ? qsTr("Substituir Código") : qsTr("Substituir no Bloco")
                color: applyButton.hovered ? "#ffffff"
                    : actionsRoot.proposal && actionsRoot.proposal.isSearchReplace ? "#6ee7b7" : "#c4b5fd"
                font.pixelSize: 11
                font.weight: Font.Medium
            }
        }
    }

    Button {
        objectName: "notesAiDiffMessage"
        visible: actionsRoot.proposal && actionsRoot.proposal.diffAvailable && actionsRoot.proposalDiff.length > 0
        padding: 2
        leftPadding: 6
        rightPadding: 6
        onClicked: actionsRoot.diffToggled(actionsRoot.diffMessageIndex === actionsRoot.messageIndex ? -1 : actionsRoot.messageIndex)
        background: Rectangle {
            radius: 5
            color: actionsRoot.diffMessageIndex === actionsRoot.messageIndex ? "#33f59e0b" : "#1affffff"
            border.color: "#24ffffff"
        }
        contentItem: Row {
            anchors.centerIn: parent
            spacing: 4
            AppIcon {
                name: "file-symlink"
                color: actionsRoot.diffMessageIndex === actionsRoot.messageIndex ? "#fcd34d" : "#a7a9be"
                width: 11
                height: 11
            }
            Text {
                text: actionsRoot.diffMessageIndex === actionsRoot.messageIndex ? qsTr("Ver Texto") : qsTr("Ver Diff")
                color: actionsRoot.diffMessageIndex === actionsRoot.messageIndex ? "#fcd34d" : "#a7a9be"
                font.pixelSize: 11
            }
        }
    }

    Button {
        objectName: "notesAiInsertMessage"
        visible: actionsRoot.proposal && !actionsRoot.proposal.isSearchReplace
        enabled: !actionsRoot.isGenerating
        padding: 2
        leftPadding: 6
        rightPadding: 6
        onClicked: actionsRoot.insertRequested(
            actionsRoot.message, actionsRoot.proposal.cleanText, actionsRoot.proposal.isSearchReplace)
        background: Rectangle { radius: 5; color: "#1affffff"; border.color: "#24ffffff" }
        contentItem: Row {
            anchors.centerIn: parent
            spacing: 4
            AppIcon { name: "plus"; color: "#cbd5e1"; width: 11; height: 11 }
            Text { text: qsTr("Inserir"); color: "#cbd5e1"; font.pixelSize: 11 }
        }
    }

    Button {
        objectName: "notesAiCopyMessage"
        visible: Boolean(actionsRoot.proposal)
        padding: 2
        leftPadding: 6
        rightPadding: 6
        onClicked: actionsRoot.copyRequested(
            actionsRoot.message, actionsRoot.messageIndex,
            actionsRoot.proposal.cleanText || String(actionsRoot.message.content || ""))
        background: Rectangle { radius: 5; color: "transparent" }
        contentItem: Row {
            anchors.centerIn: parent
            spacing: 4
            AppIcon {
                name: actionsRoot.copiedMessageIndex === actionsRoot.messageIndex ? "check" : "copy"
                color: actionsRoot.copiedMessageIndex === actionsRoot.messageIndex ? "#34d399" : "#a1a1aa"
                width: 11
                height: 11
            }
            Text {
                text: actionsRoot.copiedMessageIndex === actionsRoot.messageIndex ? qsTr("Copiado!") : qsTr("Copiar")
                color: actionsRoot.copiedMessageIndex === actionsRoot.messageIndex ? "#34d399" : "#a1a1aa"
                font.pixelSize: 11
            }
        }
    }
}
