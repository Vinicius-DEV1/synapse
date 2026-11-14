import QtQuick 2.15
import QtQuick.Controls 2.15

Menu {
    id: optionsMenu
    objectName: "notesLinkOptionsMenu"

    property string linkUrl: ""
    property int blockStart: -1
    property string linkTitle: ""
    property bool watched: false
    property bool watching: false
    property string linkColor: "default"
    property string notes: ""
    property bool showNotes: false

    signal infoRequested(string url, int start, string title)
    signal snapshotRequested(string url, int start)
    signal colorRequested(string url, int start, string color)
    signal statusToggled(string url, string field)
    signal copyRequested(string url)
    signal reloadRequested(string url, int start)
    signal groupRequested(string url, int start)
    signal convertRequested(string url, int start)
    signal deleteRequested(string url, int start)

    function openForBlock(url, start, title, isWatched, isWatching, color, blockNotes, isShowNotes) {
        linkUrl = String(url || "")
        blockStart = Number(start)
        linkTitle = String(title || "")
        watched = isWatched === true
        watching = isWatching === true
        linkColor = String(color || "default")
        notes = String(blockNotes || "")
        showNotes = isShowNotes === true
        popup()
    }

    background: Rectangle {
        color: "#181722"
        radius: 12
        border.color: "#1effffff"
    }

    delegate: MenuItem {
        id: menuItem
        contentItem: Text {
            text: menuItem.text
            color: menuItem.enabled ? (menuItem.highlighted ? "#ffffff" : "#cbd5e1") : "#64748b"
            font.pixelSize: 12
            verticalAlignment: Text.AlignVCenter
        }
        background: Rectangle {
            color: menuItem.highlighted ? "#1affffff" : "transparent"
            radius: 6
        }
    }

    MenuItem {
        text: qsTr("ℹ Informações & Resumo IA")
        onTriggered: optionsMenu.infoRequested(optionsMenu.linkUrl, optionsMenu.blockStart, optionsMenu.linkTitle)
    }

    MenuItem {
        text: qsTr("📄 Salvar Snapshot Offline")
        onTriggered: optionsMenu.snapshotRequested(optionsMenu.linkUrl, optionsMenu.blockStart)
    }

    MenuSeparator {
        contentItem: Rectangle { implicitHeight: 1; color: "#14ffffff" }
    }

    MenuItem {
        text: qsTr("🎨 Personalizar Cor")
        onTriggered: optionsMenu.colorRequested(optionsMenu.linkUrl, optionsMenu.blockStart, optionsMenu.linkColor)
    }

    MenuItem {
        text: optionsMenu.watching ? qsTr("⏳ Marcar como não assistindo") : qsTr("⏳ Assistindo")
        onTriggered: optionsMenu.statusToggled(optionsMenu.linkUrl, "watching")
    }

    MenuItem {
        text: optionsMenu.watched ? qsTr("✓ Marcar como não concluído") : qsTr("✓ Marcar como concluído")
        onTriggered: optionsMenu.statusToggled(optionsMenu.linkUrl, "watched")
    }

    MenuSeparator {
        contentItem: Rectangle { implicitHeight: 1; color: "#14ffffff" }
    }

    MenuItem {
        text: qsTr("📋 Copiar Link Original")
        onTriggered: optionsMenu.copyRequested(optionsMenu.linkUrl)
    }

    MenuItem {
        text: qsTr("🔄 Recarregar Metadados")
        onTriggered: optionsMenu.reloadRequested(optionsMenu.linkUrl, optionsMenu.blockStart)
    }

    MenuItem {
        text: qsTr("🪟 Agrupar Lado a Lado")
        onTriggered: optionsMenu.groupRequested(optionsMenu.linkUrl, optionsMenu.blockStart)
    }

    MenuItem {
        text: qsTr("🔗 Converter para Texto Simples")
        onTriggered: optionsMenu.convertRequested(optionsMenu.linkUrl, optionsMenu.blockStart)
    }

    MenuSeparator {
        contentItem: Rectangle { implicitHeight: 1; color: "#14ffffff" }
    }

    MenuItem {
        text: qsTr("🗑 Remover Link")
        contentItem: Text {
            text: parent.text
            color: parent.highlighted ? "#fecdd3" : "#fb7185"
            font.pixelSize: 12
            verticalAlignment: Text.AlignVCenter
        }
        background: Rectangle {
            color: parent.highlighted ? "#26ef4444" : "transparent"
            radius: 6
        }
        onTriggered: optionsMenu.deleteRequested(optionsMenu.linkUrl, optionsMenu.blockStart)
    }
}
