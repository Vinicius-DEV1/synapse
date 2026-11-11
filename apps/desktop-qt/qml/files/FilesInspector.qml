import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Rectangle {
    id: inspector
    color: "#99111118"
    border.color: theme.borderSubtle

    property var itemData: ({})
    property var linkedNotes: []
    property int selectedCount: 0
    signal closeRequested()
    signal renameRequested(var item)
    signal exportRequested(var item)
    signal linkRequested(var item)

    function formatSize(value) {
        var size = Number(value || 0)
        if (size < 1024) return size + " B"
        if (size < 1024 * 1024) return (size / 1024).toFixed(1) + " KB"
        if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(1) + " MB"
        return (size / (1024 * 1024 * 1024)).toFixed(1) + " GB"
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 14
        spacing: 12

        RowLayout {
            Layout.fillWidth: true
            Text { Layout.fillWidth: true; text: "Detalhes"; color: theme.textDark; font.pixelSize: 12; font.bold: true }
            ToolButton {
                text: "×"
                implicitWidth: 24
                implicitHeight: 24
                onClicked: inspector.closeRequested()
                background: Rectangle { color: parent.hovered ? theme.bgHover : "transparent"; radius: 6 }
                contentItem: Text { text: parent.text; color: theme.textMuted; font.pixelSize: 18; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            height: 66
            radius: 9
            color: theme.bgDarkSurface
            RowLayout {
                anchors.fill: parent
                anchors.margins: 11
                spacing: 10
                AppIcon {
                    width: 23
                    height: 23
                    name: inspector.itemData.kind === "folder" ? "folder" : "notes"
                    color: theme.brand400
                }
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 3
                    Text { Layout.fillWidth: true; text: inspector.itemData.name || "Nenhum item selecionado"; color: theme.textDark; font.pixelSize: 11; font.bold: true; elide: Text.ElideRight }
                    Text { text: inspector.itemData.kind === "folder" ? "Pasta" : String(inspector.itemData.file_type || "arquivo").toUpperCase(); color: theme.textMuted; font.pixelSize: 9 }
                }
            }
        }

        Label {
            visible: inspector.selectedCount > 1
            Layout.fillWidth: true
            text: inspector.selectedCount + " itens selecionados"
            color: theme.brand300
            font.pixelSize: 10
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: 8
            visible: inspector.itemData.kind === "file"
            Label { text: "INFORMAÇÕES"; color: theme.textMuted; font.pixelSize: 9; font.bold: true; font.letterSpacing: 0.6 }
            RowLayout {
                Layout.fillWidth: true
                Text { Layout.fillWidth: true; text: "Tamanho"; color: theme.textMuted; font.pixelSize: 10 }
                Text { text: inspector.formatSize(inspector.itemData.file_size); color: theme.textSubtext; font.pixelSize: 10 }
            }
            RowLayout {
                Layout.fillWidth: true
                Text { Layout.fillWidth: true; text: "Tipo"; color: theme.textMuted; font.pixelSize: 10 }
                Text { text: inspector.itemData.mime_type || "—"; color: theme.textSubtext; font.pixelSize: 10; elide: Text.ElideRight }
            }
            RowLayout {
                Layout.fillWidth: true
                Text { Layout.fillWidth: true; text: "Criado"; color: theme.textMuted; font.pixelSize: 10 }
                Text { text: String(inspector.itemData.created_at || "—").slice(0, 10); color: theme.textSubtext; font.pixelSize: 10 }
            }
            RowLayout {
                Layout.fillWidth: true
                Text { Layout.fillWidth: true; text: "Modificado"; color: theme.textMuted; font.pixelSize: 10 }
                Text { text: String(inspector.itemData.updated_at || "—").slice(0, 10); color: theme.textSubtext; font.pixelSize: 10 }
            }
            RowLayout {
                Layout.fillWidth: true
                Text { Layout.fillWidth: true; text: "Armazenamento"; color: theme.textMuted; font.pixelSize: 10 }
                Text { text: inspector.itemData.has_drive_copy || inspector.itemData.drive_file_id ? "Local + Drive" : "Local"; color: inspector.itemData.has_drive_copy || inspector.itemData.drive_file_id ? theme.success : theme.textSubtext; font.pixelSize: 10 }
            }
        }

        Rectangle { Layout.fillWidth: true; height: 1; color: theme.borderSubtle }

        RowLayout {
            Layout.fillWidth: true
            Label { Layout.fillWidth: true; text: "NOTAS VINCULADAS"; color: theme.textMuted; font.pixelSize: 9; font.bold: true; font.letterSpacing: 0.6 }
            ToolButton {
                visible: inspector.itemData.kind === "file"
                text: "+"
                implicitWidth: 23
                implicitHeight: 23
                onClicked: inspector.linkRequested(inspector.itemData)
                ToolTip.visible: hovered
                ToolTip.text: "Vincular a nota"
                background: Rectangle { color: parent.hovered ? theme.bgHover : "transparent"; radius: 6 }
                contentItem: Text { text: parent.text; color: theme.brand300; font.pixelSize: 17; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
        }

        ListView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            model: inspector.linkedNotes
            delegate: RowLayout {
                required property var modelData
                width: parent.width
                height: 26
                AppIcon { width: 13; height: 13; name: "notes"; color: theme.brand400 }
                Text { Layout.fillWidth: true; text: modelData.page_title || "Untitled note"; color: theme.textSubtext; font.pixelSize: 10; elide: Text.ElideRight }
            }
            footer: Label {
                width: parent.width
                height: visible ? 40 : 0
                visible: inspector.linkedNotes.length === 0
                text: "Nenhuma nota vinculada."
                color: theme.textMuted
                font.pixelSize: 10
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
        }

        RowLayout {
            Layout.fillWidth: true
            Button {
                Layout.fillWidth: true
                visible: inspector.itemData.kind === "file"
                text: "Baixar"
                onClicked: inspector.exportRequested(inspector.itemData)
                background: Rectangle { color: theme.bgDarkSurface; border.color: theme.borderSubtle; radius: 7 }
                contentItem: Text { text: parent.text; color: theme.textSubtext; font.pixelSize: 10; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
            Button {
                Layout.fillWidth: true
                visible: Boolean(inspector.itemData.id)
                text: "Renomear"
                onClicked: inspector.renameRequested(inspector.itemData)
                background: Rectangle { color: theme.bgDarkSurface; border.color: theme.borderSubtle; radius: 7 }
                contentItem: Text { text: parent.text; color: theme.textSubtext; font.pixelSize: 10; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
        }
    }
}
