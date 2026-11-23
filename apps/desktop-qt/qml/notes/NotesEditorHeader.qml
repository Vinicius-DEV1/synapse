import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

RowLayout {
    id: headerRoot

    property bool isDirty: false
    property bool saveFailed: false
    property bool isPreviewMode: false
    property bool isRichMode: false
    property bool canUseRichMode: false
    property bool actionsVisible: false
    property string pageDate: ""
    property int wordCount: 0
    property int characterCount: 0

    signal saveRequested()
    signal deleteRequested()
    signal previewToggled(bool preview)
    signal historyRequested()
    signal moveRequested()
    signal helpRequested()
    signal shareRequested()
    signal richModeRequested(bool enabled)

    spacing: 6
    opacity: actionsVisible || isDirty || saveFailed ? 1 : 0.15
    Behavior on opacity { NumberAnimation { duration: 150 } }

    Button {
        Layout.preferredHeight: 28
        padding: 8
        focusPolicy: Qt.NoFocus
        Accessible.name: qsTr("Move page")
        onClicked: headerRoot.moveRequested()
        ToolTip.visible: hovered
        ToolTip.text: qsTr("Mover página…")
        background: Rectangle {
            radius: 7
            color: parent.hovered ? "#1a8b5cf6" : "transparent"
            border.color: parent.hovered ? "#338b5cf6" : "transparent"
        }
        contentItem: RowLayout {
            spacing: 5
            AppIcon { name: "file-symlink"; color: parent.parent.hovered ? "#ddd6fe" : "#94a1b2"; width: 13; height: 13 }
            Text { text: qsTr("Mover"); color: parent.parent.hovered ? "#fffffe" : "#94a1b2"; font.pixelSize: 11; font.weight: Font.Medium }
        }
    }

    Button {
        Layout.preferredHeight: 28
        padding: 8
        focusPolicy: Qt.NoFocus
        Accessible.name: qsTr("Edit history")
        onClicked: headerRoot.historyRequested()
        ToolTip.visible: hovered
        ToolTip.text: qsTr("Histórico de edições")
        background: Rectangle {
            radius: 7
            color: parent.hovered ? "#1a8b5cf6" : "transparent"
            border.color: parent.hovered ? "#338b5cf6" : "transparent"
        }
        contentItem: RowLayout {
            spacing: 5
            AppIcon { name: "refresh"; color: parent.parent.hovered ? "#ddd6fe" : "#94a1b2"; width: 13; height: 13 }
            Text { text: qsTr("Histórico"); color: parent.parent.hovered ? "#fffffe" : "#94a1b2"; font.pixelSize: 11; font.weight: Font.Medium }
        }
    }

    Button {
        Layout.preferredHeight: 28
        padding: 8
        focusPolicy: Qt.NoFocus
        Accessible.name: qsTr("Share page")
        onClicked: headerRoot.shareRequested()
        ToolTip.visible: hovered
        ToolTip.text: qsTr("Compartilhar link…")
        background: Rectangle {
            radius: 7
            color: parent.hovered ? "#1a8b5cf6" : "transparent"
            border.color: parent.hovered ? "#338b5cf6" : "transparent"
        }
        contentItem: RowLayout {
            spacing: 5
            AppIcon { name: "share"; color: parent.parent.hovered ? "#ddd6fe" : "#94a1b2"; width: 13; height: 13 }
            Text { text: qsTr("Compartilhar"); color: parent.parent.hovered ? "#fffffe" : "#94a1b2"; font.pixelSize: 11; font.weight: Font.Medium }
        }
    }

    ToolButton {
        Layout.preferredWidth: 74
        Layout.preferredHeight: 28
        focusPolicy: Qt.NoFocus
        Accessible.name: headerRoot.saveFailed ? qsTr("Retry saving note") : qsTr("Save note")
        onClicked: headerRoot.saveRequested()
        readonly property int readingTimeMinutes: Math.max(1, Math.ceil(headerRoot.wordCount / 200))
        ToolTip.visible: hovered
        ToolTip.text: headerRoot.saveFailed
            ? qsTr("Falha ao salvar. Clique para tentar novamente.")
            : qsTr("%1 · %2 palavras · %3 min leitura").arg(headerRoot.pageDate).arg(headerRoot.wordCount).arg(readingTimeMinutes)
        background: Rectangle {
            color: headerRoot.saveFailed ? "#24f43f5e" : headerRoot.isDirty ? "#8b5cf6" : "#0d10b981"
            border.color: headerRoot.saveFailed ? "#66f43f5e" : headerRoot.isDirty ? "#668b5cf6" : "#3310b981"
            radius: 7
        }
        contentItem: RowLayout {
            spacing: 4
            anchors.centerIn: parent
            Text {
                text: headerRoot.saveFailed ? "⚠" : headerRoot.isDirty ? "●" : "✓"
                color: headerRoot.saveFailed ? "#fb7185" : headerRoot.isDirty ? "white" : "#34d399"
                font.pixelSize: 10
            }
            Text {
                text: headerRoot.saveFailed ? qsTr("Tentar") : headerRoot.isDirty ? qsTr("Salvar") : qsTr("Salvo")
                color: headerRoot.saveFailed ? "#fda4af" : headerRoot.isDirty ? "white" : "#34d399"
                font.pixelSize: 10
                font.bold: true
            }
        }
    }

    ToolButton {
        Layout.preferredWidth: 28
        Layout.preferredHeight: 28
        focusPolicy: Qt.NoFocus
        Accessible.name: qsTr("More options")
        onClicked: moreMenu.open()
        background: Rectangle { color: parent.hovered ? "#1affffff" : "transparent"; radius: 7 }
        contentItem: AppIcon { anchors.centerIn: parent; name: "more-horizontal"; color: "#94a1b2"; width: 15; height: 15 }

        Menu {
            id: moreMenu
            background: Rectangle { color: "#181726"; radius: 10; border.color: "#22ffffff" }
            MenuItem {
                text: headerRoot.isRichMode ? qsTr("Editar código-fonte HTML") : qsTr("Modo visual")
                enabled: headerRoot.isRichMode || headerRoot.canUseRichMode
                onTriggered: headerRoot.richModeRequested(!headerRoot.isRichMode)
            }
            MenuItem {
                text: qsTr("Guia do Caderno")
                onTriggered: headerRoot.helpRequested()
            }
            MenuSeparator {}
            MenuItem {
                text: qsTr("Mover para Lixeira")
                onTriggered: headerRoot.deleteRequested()
            }
        }
    }
}
