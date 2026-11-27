import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Item {
    id: headerRoot

    property int viewportWidth: 0
    property var history: []
    property int selectedIndex: 0
    property bool showDiff: true
    property bool diffEnabled: false
    property bool restoreEnabled: false

    signal diffToggleRequested()
    signal restoreRequested()
    signal closeRequested()

    implicitHeight: 56
    Layout.fillWidth: true
    Layout.preferredHeight: 56

    Rectangle {
        anchors.fill: parent
        color: "#0f0f11"
        border.color: "#0affffff"

        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: headerRoot.viewportWidth >= 640 ? 32 : 20
            anchors.rightMargin: headerRoot.viewportWidth >= 640 ? 32 : 20
            spacing: 10

            Rectangle {
                width: 32
                height: 32
                radius: 8
                color: "#08ffffff"
                border.color: "#0affffff"
                AppIcon {
                    anchors.centerIn: parent
                    width: 15
                    height: 15
                    name: "clock"
                    color: theme.textSubtext
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 8
                Text {
                    objectName: "historyModalTitle"
                    text: "Histórico de Edições"
                    color: theme.textDark
                    font.pixelSize: 14
                    font.bold: true
                }
                Text {
                    objectName: "historyRevisionCount"
                    text: "• " + headerRoot.history.length
                          + (headerRoot.history.length === 1 ? " revisão" : " revisões")
                    color: theme.textMuted
                    font.pixelSize: 12
                    font.family: theme.fontMono
                    visible: headerRoot.viewportWidth >= 640
                }
            }

            Button {
                objectName: "historyDiffToggleButton"
                text: headerRoot.showDiff ? qsTr("Modo Diff Ativo ✓") : qsTr("Ver Diff")
                flat: true
                visible: headerRoot.viewportWidth >= 768 && headerRoot.diffEnabled
                enabled: headerRoot.diffEnabled
                onClicked: headerRoot.diffToggleRequested()
                contentItem: Text {
                    text: parent.text
                    color: headerRoot.showDiff ? "#34d399" : "#a1a1aa"
                    font.pixelSize: 11
                }
            }

            Button {
                objectName: "historyRestoreButton"
                text: qsTr("Restaurar Esta Versão")
                flat: true
                visible: headerRoot.viewportWidth >= 768 && headerRoot.selectedIndex > 0
                         && headerRoot.selectedIndex < headerRoot.history.length
                enabled: headerRoot.restoreEnabled
                onClicked: headerRoot.restoreRequested()
                contentItem: Text {
                    text: parent.text
                    color: "#a78bfa"
                    font.pixelSize: 11
                    font.bold: true
                }
            }

            ToolButton {
                objectName: "historyHeaderOverflowButton"
                visible: headerRoot.viewportWidth < 768
                text: "⋯"
                Accessible.name: qsTr("Mais ações do histórico")
                implicitWidth: 28
                implicitHeight: 28
                onClicked: historyHeaderOverflowMenu.open()
                background: Rectangle {
                    radius: 7
                    color: parent.hovered ? "#14ffffff" : "transparent"
                }
            }

            ToolButton {
                id: historyCloseButton
                objectName: "historyCloseButton"
                Accessible.name: qsTr("Fechar histórico de edições")
                implicitWidth: 34
                implicitHeight: 34
                onClicked: headerRoot.closeRequested()
                ToolTip.visible: hovered
                ToolTip.text: qsTr("Fechar (Esc)")
                background: Rectangle {
                    color: parent.hovered ? "#1affffff" : "transparent"
                    radius: 8
                }
                contentItem: Item {
                    implicitWidth: 18
                    implicitHeight: 18
                    AppIcon {
                        objectName: "historyCloseIcon"
                        anchors.centerIn: parent
                        name: "close"
                        color: historyCloseButton.hovered ? theme.textDark : "#a1a1aa"
                        width: 18
                        height: 18
                    }
                }
            }
        }
    }

    Menu {
        id: historyHeaderOverflowMenu
        objectName: "historyHeaderOverflowMenu"
        MenuItem {
            objectName: "historyDiffMenuItem"
            text: headerRoot.showDiff ? qsTr("Desativar diff") : qsTr("Ativar diff")
            enabled: headerRoot.diffEnabled
            onTriggered: headerRoot.diffToggleRequested()
        }
        MenuItem {
            objectName: "historyRestoreMenuItem"
            text: qsTr("Restaurar esta versão")
            enabled: headerRoot.restoreEnabled
            onTriggered: headerRoot.restoreRequested()
        }
    }
}
