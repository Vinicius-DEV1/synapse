pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Dialog {
    id: managerRoot
    parent: Overlay.overlay
    anchors.centerIn: parent
    width: Math.min(parent ? parent.width - 32 : 640, 680)
    height: Math.min(parent ? parent.height - 32 : 620, 620)
    modal: true
    focus: true
    padding: 0
    closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
    standardButtons: Dialog.NoButton

    property bool isOpen: false
    property var controller: null
    property string bundleTitle: qsTr("Documentos")
    property string groupColor: "default"
    property var bundleItems: []
    property var looseFileItems: []
    property bool looseFilesExpanded: false
    property string errorMessage: ""
    property string pendingRemovalFileId: ""

    signal closeRequested()
    signal itemsReordered(var nextItems)
    signal titleUpdateRequested(string nextTitle)
    signal addFilesRequested()
    signal absorbLooseFileRequested(var sourceBlockPath, string fileId)
    signal itemUngroupRequested(string fileId)
    signal itemRemovalRequested(string fileId, bool moveToTrash)
    signal ungroupAllRequested()

    onIsOpenChanged: {
        if (isOpen) open()
        else close()
    }
    onOpened: {
        managerRoot.errorMessage = ""
        managerRoot.looseFilesExpanded = false
    }
    onClosed: closeRequested()

    function moveItem(index, delta) {
        var targetIndex = index + delta
        moveItemTo(index, targetIndex)
    }

    function moveItemTo(sourceIndex, targetIndex) {
        if (sourceIndex < 0 || sourceIndex >= bundleItems.length ||
                targetIndex < 0 || targetIndex >= bundleItems.length ||
                sourceIndex === targetIndex) return
        var nextItems = bundleItems.slice()
        var moved = nextItems.splice(sourceIndex, 1)[0]
        nextItems.splice(targetIndex, 0, moved)
        itemsReordered(nextItems)
    }

    function hasFile(fileId) {
        for (var i = 0; i < bundleItems.length; ++i) {
            if (String(bundleItems[i].fileId || bundleItems[i].id || "") === fileId) return true
        }
        return false
    }

    function setActionError(message) {
        errorMessage = String(message || "")
        itemRemovalDialog.errorMessage = errorMessage
    }

    function openItemRemoval(fileId, itemName) {
        setActionError("")
        pendingRemovalFileId = String(fileId || "")
        itemRemovalDialog.itemName = String(itemName || qsTr("Documento"))
    }

    function requestUngroup(fileId) {
        setActionError("")
        itemUngroupRequested(fileId)
        Qt.callLater(function() {
            if (!managerRoot.hasFile(fileId)) managerRoot.closeRequested()
        })
    }

    function requestRemoval(fileId, moveToTrash) {
        managerRoot.errorMessage = ""
        itemRemovalRequested(fileId, moveToTrash)
        Qt.callLater(function() {
            if (!managerRoot.hasFile(fileId)) {
                managerRoot.pendingRemovalFileId = ""
                itemRemovalDialog.close()
            }
        })
    }

    background: Rectangle {
        color: "#0f0e17"
        radius: 16
        border.color: "#1affffff"
        border.width: 1
    }

    contentItem: ColumnLayout {
        spacing: 0

        DocumentBundleManagerHeader {
            bundleTitle: managerRoot.bundleTitle
            groupColor: managerRoot.groupColor
            itemCount: managerRoot.bundleItems.length
            onTitleUpdateRequested: function(nextTitle) { managerRoot.titleUpdateRequested(nextTitle) }
            onCloseRequested: managerRoot.close()
        }

        Rectangle { Layout.fillWidth: true; Layout.preferredHeight: 1; color: "#0dffffff" }

        Text {
            Layout.fillWidth: true
            Layout.leftMargin: 20
            Layout.rightMargin: 20
            Layout.topMargin: 14
            visible: managerRoot.errorMessage.length > 0
            text: managerRoot.errorMessage
            color: "#fda4af"
            font.pixelSize: 11
            wrapMode: Text.Wrap
        }

        ListView {
            id: itemList
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.margins: 18
            spacing: 8
            clip: true
            model: managerRoot.bundleItems

            delegate: DocumentBundleManagerItem {
                required property var modelData
                required property int index
                width: ListView.view.width
                itemData: modelData
                isFirst: index === 0
                isLast: index === managerRoot.bundleItems.length - 1
                onMoveRequested: function(itemIndex, delta) { managerRoot.moveItem(itemIndex, delta) }
                onReorderRequested: function(sourceIndex, targetIndex) {
                    managerRoot.moveItemTo(sourceIndex, targetIndex)
                }
                onPreviewRequested: function(fileId) {
                    var c = managerRoot.controller || null
                    if (fileId && c && typeof c.previewLocalFile === "function") c.previewLocalFile(fileId)
                }
                onUngroupRequested: function(fileId) {
                    managerRoot.requestUngroup(fileId)
                }
                onRemoveRequested: function(fileId) {
                    managerRoot.pendingRemovalFileId = fileId
                    itemRemovalDialog.errorMessage = ""
                    itemRemovalDialog.itemName = String(modelData.name || modelData.title || qsTr("Documento"))
                }
            }

            Text {
                anchors.centerIn: parent
                visible: managerRoot.bundleItems.length === 0
                text: qsTr("Nenhum documento neste agrupamento.")
                color: "#71717a"
                font.pixelSize: 12
            }
        }

        Button {
            id: looseFilesToggle
            Layout.fillWidth: true
            Layout.leftMargin: 18
            Layout.rightMargin: 18
            Layout.bottomMargin: managerRoot.looseFilesExpanded ? 8 : 14
            Layout.preferredHeight: 36
            text: managerRoot.looseFilesExpanded
                ? qsTr("Ocultar arquivos soltos desta página")
                : qsTr("Anexar documento que está solto nesta página")
            onClicked: managerRoot.looseFilesExpanded = !managerRoot.looseFilesExpanded
            background: Rectangle {
                radius: 9
                color: looseFilesToggle.hovered ? "#141a1926" : "transparent"
                border.color: looseFilesToggle.hovered ? "#558b5cf6" : "#338b5cf6"
                border.width: 1
            }
            contentItem: RowLayout {
                spacing: 8
                AppIcon {
                    name: "plus"
                    color: "#a78bfa"
                    Layout.preferredWidth: 13
                    Layout.preferredHeight: 13
                }
                Text {
                    Layout.fillWidth: true
                    text: looseFilesToggle.text
                    color: "#c4b5fd"
                    font.pixelSize: 10
                    elide: Text.ElideRight
                }
                Text {
                    text: String(managerRoot.looseFileItems.length)
                    color: "#858597"
                    font.pixelSize: 9
                    font.family: "monospace"
                }
            }
        }

        ListView {
            id: looseFileList
            Layout.fillWidth: true
            Layout.leftMargin: 18
            Layout.rightMargin: 18
            Layout.preferredHeight: managerRoot.looseFilesExpanded
                ? Math.min(144, Math.max(48, contentHeight)) : 0
            visible: managerRoot.looseFilesExpanded
            spacing: 5
            clip: true
            model: managerRoot.looseFileItems

            delegate: DocumentBundleLooseFileItem {
                required property var modelData
                width: ListView.view.width
                itemData: modelData
                onAbsorbRequested: function(sourceBlockPath, fileId) {
                    managerRoot.absorbLooseFileRequested(sourceBlockPath, fileId)
                }
            }

            Text {
                anchors.centerIn: parent
                visible: managerRoot.looseFileItems.length === 0
                text: qsTr("Nenhum outro documento avulso encontrado nesta página.")
                color: "#71717a"
                font.pixelSize: 10
            }
        }

        Button {
            id: addFilesButton
            Layout.fillWidth: true
            Layout.leftMargin: 18
            Layout.rightMargin: 18
            Layout.bottomMargin: 14
            Layout.preferredHeight: 40
            onClicked: managerRoot.addFilesRequested()
            background: Rectangle {
                radius: 10
                color: addFilesButton.hovered ? "#1c1729" : "transparent"
                border.color: addFilesButton.hovered ? "#668b5cf6" : "#338b5cf6"
            }
            contentItem: RowLayout {
                spacing: 8
                AppIcon {
                    name: "plus"
                    color: "#a78bfa"
                    Layout.preferredWidth: 14
                    Layout.preferredHeight: 14
                }
                Text {
                    text: qsTr("Adicionar documento salvo")
                    color: "#c4b5fd"
                    font.pixelSize: 11
                    Layout.fillWidth: true
                }
            }
        }

        Rectangle { Layout.fillWidth: true; Layout.preferredHeight: 1; color: "#0dffffff" }

        RowLayout {
            Layout.fillWidth: true
            Layout.preferredHeight: 58
            Layout.leftMargin: 18
            Layout.rightMargin: 18
            spacing: 8

            Button {
                id: ungroupAllButton
                Layout.fillWidth: true
                enabled: managerRoot.bundleItems.length > 0
                text: qsTr("Desagrupar Todos na Página")
                onClicked: managerRoot.ungroupAllRequested()
                background: Rectangle {
                    radius: 8
                    color: ungroupAllButton.enabled
                        ? (ungroupAllButton.hovered ? "#33282216" : "#1a221b12") : "transparent"
                    border.color: ungroupAllButton.enabled ? "#44f59e0b" : "#12ffffff"
                }
                contentItem: Text {
                    text: ungroupAllButton.text
                    color: ungroupAllButton.enabled ? "#fbbf24" : "#71717a"
                    font.pixelSize: 10
                    font.weight: Font.Medium
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }

            Button {
                id: finishButton
                text: qsTr("Concluir")
                onClicked: managerRoot.close()
                background: Rectangle {
                    radius: 8
                    color: finishButton.hovered ? "#2b2a35" : "#22212b"
                    border.color: "#1affffff"
                }
                contentItem: Text {
                    text: finishButton.text
                    color: "#fffffe"
                    font.pixelSize: 11
                    font.weight: Font.Medium
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }
        }
    }

    DocumentBundleItemRemovalDialog {
        id: itemRemovalDialog
        isOpen: managerRoot.pendingRemovalFileId.length > 0
        onUnlinkRequested: managerRoot.requestRemoval(managerRoot.pendingRemovalFileId, false)
        onMoveToTrashRequested: managerRoot.requestRemoval(managerRoot.pendingRemovalFileId, true)
        onDismissed: {
            if (managerRoot.hasFile(managerRoot.pendingRemovalFileId))
                managerRoot.pendingRemovalFileId = ""
            itemRemovalDialog.errorMessage = ""
        }
    }
}
