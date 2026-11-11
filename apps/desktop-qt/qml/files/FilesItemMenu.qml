import QtQuick 2.15
import QtQuick.Controls 2.15

Menu {
    id: itemMenu

    property var itemData: ({})
    property bool isFolder: itemData.kind === "folder"
    signal actionRequested(string action, var item)

    background: Rectangle {
        color: theme.bgDarkCard
        border.color: theme.borderCard
        radius: 9
    }

    delegate: MenuItem {
        contentItem: Text {
            text: parent.text
            color: parent.highlighted ? theme.textDark : theme.textSubtext
            font.pixelSize: 11
            verticalAlignment: Text.AlignVCenter
        }
        background: Rectangle {
            color: parent.highlighted ? theme.bgHover : "transparent"
            radius: 5
        }
    }

    MenuItem {
        text: "Abrir"
        visible: itemMenu.isFolder
        onTriggered: itemMenu.actionRequested("open", itemMenu.itemData)
    }
    MenuItem {
        text: "Pré-visualizar"
        visible: !itemMenu.isFolder
        onTriggered: itemMenu.actionRequested("preview", itemMenu.itemData)
    }
    MenuItem {
        text: "Baixar arquivo"
        visible: !itemMenu.isFolder
        onTriggered: itemMenu.actionRequested("export", itemMenu.itemData)
    }
    MenuItem {
        text: "Vincular a nota"
        visible: !itemMenu.isFolder
        onTriggered: itemMenu.actionRequested("link", itemMenu.itemData)
    }
    MenuItem {
        text: "Notas vinculadas"
        visible: !itemMenu.isFolder
        onTriggered: itemMenu.actionRequested("links", itemMenu.itemData)
    }
    MenuItem {
        text: "Detalhes"
        visible: !itemMenu.isFolder
        onTriggered: itemMenu.actionRequested("details", itemMenu.itemData)
    }
    MenuSeparator {}
    MenuItem {
        text: "Copiar"
        visible: !itemMenu.isFolder
        onTriggered: itemMenu.actionRequested("copy", itemMenu.itemData)
    }
    MenuItem {
        text: "Recortar"
        onTriggered: itemMenu.actionRequested("cut", itemMenu.itemData)
    }
    MenuItem {
        text: "Mover para…"
        onTriggered: itemMenu.actionRequested("move", itemMenu.itemData)
    }
    MenuSeparator {}
    MenuItem {
        text: "Renomear"
        onTriggered: itemMenu.actionRequested("rename", itemMenu.itemData)
    }
    MenuItem {
        text: "Mover para a lixeira"
        onTriggered: itemMenu.actionRequested("trash", itemMenu.itemData)
    }
}
