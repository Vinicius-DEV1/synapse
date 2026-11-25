import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

// Full-screen offline web snapshot viewer mirroring apps/web-react/src/components/modals/ScrapViewerModal.tsx.
Popup {
    id: scrapModalRoot
    modal: true
    focus: true
    parent: Overlay.overlay
    closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
    width: Math.min(1120, parent ? parent.width - 36 : 1120)
    height: parent ? Math.round(parent.height * 0.88) : 720
    x: parent ? Math.round((parent.width - width) / 2) : 0
    y: parent ? Math.round((parent.height - height) / 2) : 0
    padding: 0

    property string scrapTitle: ""
    property string scrapUrl: ""
    property string htmlContent: ""
    property string viewportMode: "desktop" // "desktop" | "tablet" | "mobile"
    property real zoomFactor: 1.0

    readonly property real targetViewportWidth: viewportMode === "mobile" ? 375 : (viewportMode === "tablet" ? 768 : width - 48)

    background: Rectangle { radius: 14; color: "#0f0e17"; border.color: "#22ffffff" }

    contentItem: ColumnLayout {
        spacing: 0

        Rectangle {
            Layout.fillWidth: true; Layout.preferredHeight: 50; color: "#151422"
            Rectangle { anchors.bottom: parent.bottom; anchors.left: parent.left; anchors.right: parent.right; height: 1; color: "#12ffffff" }

            RowLayout {
                anchors.fill: parent; anchors.leftMargin: 16; anchors.rightMargin: 12; spacing: 10
                AppIcon { name: "globe"; color: "#8b5cf6"; width: 16; height: 16 }
                ColumnLayout {
                    Layout.fillWidth: true; spacing: 1
                    Text { text: scrapModalRoot.scrapTitle || qsTr("Captura Web Offline"); color: "#fffffe"; font.pixelSize: 13; font.bold: true; elide: Text.ElideRight; Layout.fillWidth: true }
                    Text { visible: scrapModalRoot.scrapUrl.length > 0; text: scrapModalRoot.scrapUrl; color: "#71717a"; font.pixelSize: 10; elide: Text.ElideRight; Layout.fillWidth: true }
                }

                Repeater {
                    model: [{ id: "desktop", lbl: "Desktop" }, { id: "tablet", lbl: "768px" }, { id: "mobile", lbl: "375px" }]
                    delegate: Button {
                        required property var modelData
                        Layout.preferredHeight: 26; leftPadding: 8; rightPadding: 8; focusPolicy: Qt.NoFocus
                        onClicked: scrapModalRoot.viewportMode = modelData.id
                        background: Rectangle { radius: 6; color: scrapModalRoot.viewportMode === modelData.id ? "#338b5cf6" : "#0dffffff" }
                        contentItem: Text { text: modelData.lbl; color: scrapModalRoot.viewportMode === modelData.id ? "#c4b5fd" : "#a7a9be"; font.pixelSize: 10; font.bold: true }
                    }
                }

                ToolButton {
                    Layout.preferredWidth: 26; Layout.preferredHeight: 26; focusPolicy: Qt.NoFocus
                    onClicked: scrapModalRoot.zoomFactor = Math.max(0.5, scrapModalRoot.zoomFactor - 0.1)
                    contentItem: AppIcon { anchors.centerIn: parent; name: "minus"; color: "#a7a9be"; width: 12; height: 12 }
                }
                Text { text: Math.round(scrapModalRoot.zoomFactor * 100) + "%"; color: "#94a1b2"; font.pixelSize: 10; font.family: "monospace" }
                ToolButton {
                    Layout.preferredWidth: 26; Layout.preferredHeight: 26; focusPolicy: Qt.NoFocus
                    onClicked: scrapModalRoot.zoomFactor = Math.min(2.0, scrapModalRoot.zoomFactor + 0.1)
                    contentItem: AppIcon { anchors.centerIn: parent; name: "plus"; color: "#a7a9be"; width: 12; height: 12 }
                }

                ToolButton {
                    visible: scrapModalRoot.scrapUrl.length > 0
                    Layout.preferredWidth: 28; Layout.preferredHeight: 28; focusPolicy: Qt.NoFocus
                    ToolTip.visible: hovered; ToolTip.text: qsTr("Abrir URL original")
                    onClicked: Qt.openUrlExternally(scrapModalRoot.scrapUrl)
                    contentItem: AppIcon { anchors.centerIn: parent; name: "external-link"; color: "#a7a9be"; width: 13; height: 13 }
                }

                ToolButton {
                    Layout.preferredWidth: 28; Layout.preferredHeight: 28; focusPolicy: Qt.NoFocus
                    onClicked: scrapModalRoot.close()
                    contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: "#a7a9be"; width: 13; height: 13 }
                }
            }
        }

        ScrollView {
            Layout.fillWidth: true; Layout.fillHeight: true; clip: true
            Rectangle {
                width: Math.min(scrapModalRoot.width - 36, scrapModalRoot.targetViewportWidth)
                height: Math.max(400, readerText.implicitHeight + 48)
                anchors.horizontalCenter: parent ? parent.horizontalCenter : undefined
                color: "#161522"; radius: 10
                TextArea {
                    id: readerText
                    anchors.fill: parent; anchors.margins: 24
                    readOnly: true
                    textFormat: TextEdit.RichText
                    text: scrapModalRoot.htmlContent || "<p>Snapshot vazio.</p>"
                    color: "#e2e8f0"
                    font.pixelSize: Math.round(14 * scrapModalRoot.zoomFactor)
                    wrapMode: TextEdit.Wrap
                    background: null
                }
            }
        }
    }
}
