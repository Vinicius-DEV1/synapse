pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

// Saved-file picker for the document-bundle manager.
Item {
    id: bundleModalRoot
    parent: Overlay.overlay
    anchors.fill: parent
    visible: isOpen
    z: 100

    property var controller: null
    property bool isOpen: false
    property var allFiles: []
    property var filteredFiles: []
    property var existingIds: []

    signal fileSelected(var fileItem)
    signal closed()

    function refreshList() {
        var c = bundleModalRoot.controller
        if (!c) { allFiles = []; filteredFiles = []; return }
        allFiles = (typeof c.getFiles === "function") ? (c.getFiles("") || []) : []
        applySearch()
    }

    function applySearch() {
        var q = String(searchField.text || "").trim().toLowerCase()
        var out = []
        for (var i = 0; i < allFiles.length; ++i) {
            var f = allFiles[i]
            if (!f || !f.id) continue
            if (existingIds.indexOf(f.id) >= 0) continue
            var nm = String(f.name || "").toLowerCase()
            if (q.length === 0 || nm.indexOf(q) >= 0) out.push(f)
        }
        filteredFiles = out
    }

    onIsOpenChanged: {
        if (isOpen) {
            searchField.text = ""
            refreshList()
            searchField.forceActiveFocus()
        }
    }

    Rectangle {
        anchors.fill: parent
        color: "#b0000000"
        MouseArea { anchors.fill: parent; onClicked: bundleModalRoot.closed() }
    }

    Rectangle {
        width: 460
        height: 500
        anchors.centerIn: parent
        radius: 16
        color: "#16161e"
        border.color: "#2e2e38"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 20
            spacing: 12

            RowLayout {
                Layout.fillWidth: true
                spacing: 10
                AppIcon { name: "files"; color: "#7c3aed"; Layout.preferredWidth: 20; Layout.preferredHeight: 20 }
                Text { text: qsTr("Adicionar Documento ao Pacote"); color: "#fffffe"; font.pixelSize: 15; font.weight: Font.Bold; Layout.fillWidth: true }
                ToolButton {
                    Layout.preferredWidth: 28; Layout.preferredHeight: 28; focusPolicy: Qt.NoFocus
                    onClicked: bundleModalRoot.closed()
                    contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: "#9ca3af"; width: 14; height: 14 }
                }
            }

            TextField {
                id: searchField
                Layout.fillWidth: true; Layout.preferredHeight: 36
                placeholderText: qsTr("Buscar arquivos ou documentos...")
                color: "#fffffe"; placeholderTextColor: "#4b5563"; font.pixelSize: 12
                background: Rectangle { radius: 8; color: "#0f0e17"; border.color: searchField.activeFocus ? "#7c3aed" : "#2e2e38"; border.width: 1 }
                onTextEdited: bundleModalRoot.applySearch()
                Keys.onEscapePressed: bundleModalRoot.closed()
            }

            ListView {
                Layout.fillWidth: true; Layout.fillHeight: true; clip: true; spacing: 6
                model: bundleModalRoot.filteredFiles
                delegate: Rectangle {
                    id: fileDelegate
                    required property var modelData
                    width: ListView.view.width; height: 42; radius: 8
                    color: fMouse.containsMouse ? "#222232" : "#0f0e17"
                    border.color: "#2a2a36"; border.width: 1
                    RowLayout {
                        anchors.fill: parent; anchors.leftMargin: 12; anchors.rightMargin: 12; spacing: 8
                        AppIcon { name: "file-text"; color: "#60a5fa"; Layout.preferredWidth: 15; Layout.preferredHeight: 15 }
                        Text { text: fileDelegate.modelData.name || qsTr("Arquivo"); color: "#fffffe"; font.pixelSize: 12; elide: Text.ElideRight; Layout.fillWidth: true }
                        Text { text: String(fileDelegate.modelData.file_type || "DOC").toUpperCase(); color: "#71717a"; font.pixelSize: 10; font.family: "monospace" }
                        AppIcon { name: "plus"; color: "#7c3aed"; Layout.preferredWidth: 14; Layout.preferredHeight: 14 }
                    }
                    MouseArea {
                        id: fMouse; anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor
                        onClicked: { bundleModalRoot.fileSelected(fileDelegate.modelData); bundleModalRoot.closed() }
                    }
                }
            }
        }
    }
}
