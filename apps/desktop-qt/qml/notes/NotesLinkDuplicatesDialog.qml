pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Dialog {
    id: duplicatesDialog
    objectName: "notesLinkDuplicatesDialog"
    parent: Overlay.overlay
    anchors.centerIn: parent
    width: Math.min(parent ? parent.width - 32 : 512, 512)
    height: Math.min(parent ? parent.height * 0.85 : 680,
                     276 + Math.min(duplicatePages.length, 6) * 72)
    modal: true
    focus: true
    padding: 0
    closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
    standardButtons: Dialog.NoButton
    Overlay.modal: Rectangle { color: "#a6000000" }

    property var controller: null
    property string url: ""
    property string linkTitle: ""
    property var duplicatePages: []
    property var displayPages: []

    signal navigateToPage(string pageId)

    background: Rectangle {
        color: "#f217181b"
        border.color: "#1affffff"
        radius: 16
    }

    function prepareDisplayPages() {
        var rawPages = duplicatePages || []
        var pageTree = controller && typeof controller.getPageTree === "function"
            ? controller.getPageTree("") || [] : []
        var byId = ({})
        for (var i = 0; i < pageTree.length; i++) {
            if (pageTree[i] && pageTree[i].id)
                byId[pageTree[i].id] = pageTree[i]
        }

        var prepared = []
        for (var j = 0; j < rawPages.length; j++) {
            var page = rawPages[j] || ({})
            var treePage = byId[page.pageId] || ({})
            var ancestors = []
            var seen = ({})
            var parentId = treePage.parent_id || treePage.parentId || ""
            while (parentId && byId[parentId] && !seen[parentId]) {
                seen[parentId] = true
                var parent = byId[parentId]
                ancestors.unshift({
                    id: parent.id,
                    title: parent.title || qsTr("Sem título"),
                    icon: parent.icon || "📄"
                })
                parentId = parent.parent_id || parent.parentId || ""
            }
            prepared.push({
                id: page.pageId || page.id || "",
                title: page.pageTitle || page.title || qsTr("Sem título"),
                icon: page.pageIcon || page.icon || "📄",
                ancestors: ancestors
            })
        }
        displayPages = prepared
    }

    function openFor(targetUrl, targetTitle, matches) {
        url = String(targetUrl || "")
        linkTitle = String(targetTitle || "")
        duplicatePages = matches || []
        prepareDisplayPages()
        if (displayPages.length > 0) open()
    }

    contentItem: ColumnLayout {
        spacing: 0

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 76
            color: "#0dffffff"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 20
                anchors.rightMargin: 12
                spacing: 12

                Rectangle {
                    Layout.preferredWidth: 40
                    Layout.preferredHeight: 40
                    radius: 12
                    color: "#1af59e0b"
                    border.color: "#33f59e0b"
                    AppIcon {
                        anchors.centerIn: parent
                        name: "layers"
                        color: "#fbbf24"
                        width: 18
                        height: 18
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 3
                    Label {
                        Layout.fillWidth: true
                        text: qsTr("Link já utilizado no Caderno")
                        color: "#ffffff"
                        font.pixelSize: 16
                        font.weight: Font.DemiBold
                        elide: Text.ElideRight
                    }
                    Label {
                        Layout.fillWidth: true
                        text: duplicatesDialog.duplicatePages.length === 1
                            ? qsTr("Este recurso já foi adicionado em 1 outra página:")
                            : qsTr("Este recurso já foi adicionado em %1 outras páginas:").arg(duplicatesDialog.duplicatePages.length)
                        color: "#a1a1aa"
                        font.pixelSize: 12
                        elide: Text.ElideRight
                    }
                }

                ToolButton {
                    objectName: "notesLinkDuplicatesCloseButton"
                    Accessible.name: qsTr("Fechar")
                    text: "×"
                    onClicked: duplicatesDialog.close()
                }
            }

            Rectangle {
                anchors.bottom: parent.bottom
                width: parent.width
                height: 1
                color: "#0fffffff"
            }
        }

        Rectangle {
            Layout.fillWidth: true
            Layout.leftMargin: 20
            Layout.rightMargin: 20
            Layout.topMargin: 16
            Layout.bottomMargin: 8
            Layout.preferredHeight: linkInfo.implicitHeight + 20
            radius: 12
            color: "#4d000000"
            border.color: "#0dffffff"

            RowLayout {
                id: linkInfo
                anchors.fill: parent
                anchors.margins: 12
                spacing: 10
                AppIcon {
                    name: "external-link"
                    color: "#71717a"
                    Layout.preferredWidth: 14
                    Layout.preferredHeight: 14
                }
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Label {
                        Layout.fillWidth: true
                        visible: duplicatesDialog.linkTitle.length > 0
                        text: duplicatesDialog.linkTitle
                        color: "#e4e4e7"
                        font.pixelSize: 12
                        font.weight: Font.Medium
                        elide: Text.ElideRight
                    }
                    Label {
                        Layout.fillWidth: true
                        text: duplicatesDialog.url
                        color: "#a1a1aa"
                        font.pixelSize: 11
                        font.family: "monospace"
                        elide: Text.ElideRight
                    }
                }
            }
        }

        ListView {
            id: duplicateList
            objectName: "notesLinkDuplicatesList"
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.leftMargin: 20
            Layout.rightMargin: 20
            Layout.topMargin: 8
            Layout.bottomMargin: 8
            Layout.preferredHeight: Math.min(contentHeight, 360)
            clip: true
            spacing: 8
            model: duplicatesDialog.displayPages

            delegate: Button {
                id: pageButton
                required property var modelData
                objectName: "notesLinkDuplicatePageRow"
                width: duplicateList.width
                height: Math.max(56, rowLayout.implicitHeight + 24)
                onClicked: {
                    duplicatesDialog.navigateToPage(modelData.id)
                    duplicatesDialog.close()
                }
                background: Rectangle {
                    radius: 12
                    color: pageButton.hovered ? "#12ffffff" : "#05ffffff"
                    border.color: pageButton.hovered ? "#26ffffff" : "#0dffffff"
                }
                contentItem: RowLayout {
                    id: rowLayout
                    anchors.fill: parent
                    anchors.leftMargin: 12
                    anchors.rightMargin: 12
                    spacing: 10
                    Label { text: pageButton.modelData.icon; font.pixelSize: 16 }
                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 2
                        Label {
                            Layout.fillWidth: true
                            text: pageButton.modelData.title
                            color: pageButton.hovered ? "#ffffff" : "#e4e4e7"
                            font.pixelSize: 14
                            font.weight: Font.Medium
                            elide: Text.ElideRight
                        }
                        Label {
                            Layout.fillWidth: true
                            visible: pageButton.modelData.ancestors.length > 0
                            text: pageButton.modelData.ancestors.map(function(item) { return item.title }).join(" › ")
                            color: pageButton.hovered ? "#a1a1aa" : "#71717a"
                            font.pixelSize: 11
                            elide: Text.ElideRight
                        }
                    }
                    Label {
                        text: qsTr("Ir para página  ›")
                        color: pageButton.hovered ? "#a78bfa" : "#8b5cf6"
                        font.pixelSize: 12
                        font.weight: Font.Medium
                    }
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 56
            color: "#0dffffff"
            Rectangle { anchors.top: parent.top; width: parent.width; height: 1; color: "#0fffffff" }
            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 20
                anchors.rightMargin: 20
                Label {
                    Layout.fillWidth: true
                    text: qsTr("Pressione Esc para fechar")
                    color: "#71717a"
                    font.pixelSize: 11
                }
                Button {
                    id: acknowledgeButton
                    objectName: "notesLinkDuplicatesAcknowledgeButton"
                    text: qsTr("OK, Entendido")
                    onClicked: duplicatesDialog.close()
                    background: Rectangle {
                        radius: 10
                        color: acknowledgeButton.hovered ? "#7c3aed" : "#8b5cf6"
                    }
                    contentItem: Label {
                        text: qsTr("OK, Entendido")
                        color: "#ffffff"
                        font.pixelSize: 12
                        font.weight: Font.DemiBold
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
            }
        }
    }
}
