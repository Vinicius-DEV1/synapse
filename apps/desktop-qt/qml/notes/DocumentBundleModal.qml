pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

// Document picker & page-loose-file absorber mirroring apps/web-react/src/components/modals/DocumentBundleModal.tsx.
Item {
    id: bundleModalRoot
    parent: Overlay.overlay
    anchors.fill: parent
    visible: isOpen
    z: 100

    property var controller: null
    property string pageId: ""
    property bool isOpen: false
    property var allFiles: []
    property var filteredFiles: []
    property var existingIds: []
    property var loosePageFileIds: []

    signal fileSelected(var fileItem)
    signal absorbFilesRequested(var fileItems)
    signal closed()

    function refreshList() {
        var c = bundleModalRoot.controller
        if (!c) { allFiles = []; filteredFiles = []; return }
        allFiles = (typeof c.getFiles === "function") ? (c.getFiles("") || []) : []
        if (bundleModalRoot.pageId && typeof c.getPage === "function" && typeof c.extractLooseFileWidgetIds === "function") {
            var p = c.getPage(bundleModalRoot.pageId)
            loosePageFileIds = (p && p.content) ? (c.extractLooseFileWidgetIds(p.content) || []) : []
        } else {
            loosePageFileIds = []
        }
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

            Button {
                id: absorbFilesButton
                visible: bundleModalRoot.loosePageFileIds.length > 0
                Layout.fillWidth: true; Layout.preferredHeight: 34; focusPolicy: Qt.NoFocus
                onClicked: {
                    var matched = []
                    for (var i = 0; i < bundleModalRoot.allFiles.length; ++i) {
                        if (bundleModalRoot.loosePageFileIds.indexOf(bundleModalRoot.allFiles[i].id) >= 0) matched.push(bundleModalRoot.allFiles[i])
                    }
                    bundleModalRoot.absorbFilesRequested(matched)
                    bundleModalRoot.closed()
                }
                background: Rectangle { radius: 8; color: absorbFilesButton.hovered ? "#338b5cf6" : "#1e1b2e"; border.color: "#4d8b5cf6" }
                contentItem: Text {
                    text: qsTr("Importar %1 documento(s) solto(s) desta página").arg(bundleModalRoot.loosePageFileIds.length)
                    color: "#c4b5fd"; font.pixelSize: 12; font.weight: Font.DemiBold
                    horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter
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
