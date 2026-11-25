import QtQuick 2.15
import QtQuick.Controls 2.15
import "../ui"
import "../page-view"

// Floating page preview & live inline editor modal mirroring apps/web-react/src/components/modals/FloatingPageModal.tsx
Popup {
    id: floatingRoot
    objectName: "floatingPageModal"

    property var controller: null
    property string pageId: ""
    property var loadedPage: ({})
    property string errorText: ""

    signal expandRequested(string pageId)
    signal pageSaved(string savedPageId, string newTitle)

    modal: true
    focus: true
    closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
    parent: Overlay.overlay
    width: Math.min(896, parent ? parent.width - 32 : 896)
    height: parent ? Math.round(parent.height * 0.85) : 680
    x: parent ? Math.round((parent.width - width) / 2) : 0
    y: parent ? Math.round((parent.height - height) / 2) : 0
    padding: 0

    Theme { id: theme }

    function openForPage(targetPageId) {
        pageId = String(targetPageId || "").trim()
        errorText = ""
        if (!pageId || !controller) {
            errorText = qsTr("Página indisponível.")
            open()
            return
        }
        var p = controller.getPage(pageId)
        if (!p || !p.id) {
            errorText = qsTr("Esta página não existe ou foi movida para a Lixeira.")
            loadedPage = ({})
            open()
            return
        }
        loadedPage = p
        embeddedPageView.selectPage(pageId)
        open()
    }

    onClosed: {
        var didSave = false
        if (typeof embeddedPageView.flushPendingEdits === "function") {
            embeddedPageView.flushPendingEdits()
        }
        if (embeddedPageView.isDirty) {
            didSave = embeddedPageView.saveActiveNote()
        }
        if (didSave && pageId) {
            pageSaved(pageId, embeddedPageView.activeTitle)
        }
    }

    background: Rectangle {
        radius: 16
        color: theme.bgDarkBg
        border.color: theme.borderCard
        border.width: 1
    }

    contentItem: Item {
        anchors.fill: parent

        // Top-right frosted action bar: Maximize (open full page) & Close
        Row {
            anchors.top: parent.top
            anchors.topMargin: 12
            anchors.right: parent.right
            anchors.rightMargin: 16
            spacing: 8
            z: 50

            Rectangle {
                width: 32; height: 32; radius: 8
                color: expandMouse.containsMouse ? "#1affffff" : theme.bgDarkCard
                border.color: theme.borderSubtle
                ToolTip.visible: expandMouse.containsMouse
                ToolTip.text: qsTr("Expandir 100%")
                AppIcon { anchors.centerIn: parent; name: "maximize"; color: expandMouse.containsMouse ? "#ffffff" : theme.textSubtext; width: 15; height: 15 }
                MouseArea {
                    id: expandMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: {
                        var pid = floatingRoot.pageId
                        floatingRoot.close()
                        floatingRoot.expandRequested(pid)
                    }
                }
            }

            Rectangle {
                width: 32; height: 32; radius: 8
                color: closeMouse.containsMouse ? theme.errorBg : theme.bgDarkCard
                border.color: theme.borderSubtle
                ToolTip.visible: closeMouse.containsMouse
                ToolTip.text: qsTr("Fechar")
                Text { anchors.centerIn: parent; text: "×"; color: closeMouse.containsMouse ? "#fda4af" : theme.textSubtext; font.pixelSize: 18 }
                MouseArea {
                    id: closeMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: floatingRoot.close()
                }
            }
        }

        Column {
            anchors.centerIn: parent
            visible: floatingRoot.errorText.length > 0
            spacing: 8
            Text { text: "⚠️"; font.pixelSize: 32; anchors.horizontalCenter: parent.horizontalCenter }
            Text { text: floatingRoot.errorText; color: theme.textSubtext; font.pixelSize: 13 }
        }

        PageView {
            id: embeddedPageView
            anchors.fill: parent
            anchors.topMargin: 8
            visible: floatingRoot.errorText.length === 0
            controller: floatingRoot.controller
            onPageSavedExternal: function(pid, newTitle) {
                floatingRoot.pageSaved(pid, newTitle)
            }
        }
    }
}
