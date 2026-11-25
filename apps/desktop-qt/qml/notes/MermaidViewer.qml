pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

// Real vector SVG Mermaid block viewer backed by core synapse-core mermaid_svg renderer.
Rectangle {
    id: mermaidRoot
    Layout.fillWidth: true
    implicitHeight: showCode ? Math.max(200, codeEditor.contentHeight + 76) : Math.max(240, Math.min(540, (svgImg.implicitHeight > 0 ? svgImg.implicitHeight * zoomLevel + 76 : 320)))
    radius: 10
    color: "#13121d"
    border.color: hoverHandler.hovered ? "#338b5cf6" : "#1affffff"
    border.width: 1
    clip: true

    property var blockData: ({})
    property var controller: null
    property var attrs: blockData && blockData.attrs ? blockData.attrs : ({})
    property string chart: attrs["code"] || ""
    property string lastSyncedCode: chart
    property bool showCode: false
    property real zoomLevel: 1.0
    property bool copiedNotice: false
    property string renderedUri: ""

    signal codeModified(string newCode)
    signal fullscreenRequested(string mermaidCode)
    signal removeRequested()

    HoverHandler { id: hoverHandler }

    function flushPendingEdits() {
        if (!codeDebounce.running) return true
        codeDebounce.stop()
        if (codeEditor.text !== lastSyncedCode) {
            lastSyncedCode = codeEditor.text
            mermaidRoot.codeModified(codeEditor.text)
        }
        return true
    }

    function hasPendingEdits() {
        return codeDebounce.running || (codeEditor.text !== lastSyncedCode)
    }

    function refreshSvg() {
        if (!controller || typeof controller.renderMermaidDataUri !== "function") { renderedUri = ""; return }
        renderedUri = controller.renderMermaidDataUri(chart || "")
    }

    Component.onCompleted: {
        lastSyncedCode = chart
        refreshSvg()
    }
    Component.onDestruction: {
        copyTimer.stop()
        codeDebounce.stop()
    }
    onChartChanged: refreshSvg()
    onBlockDataChanged: {
        var nextCode = (blockData && blockData.attrs && blockData.attrs["code"]) || ""
        lastSyncedCode = nextCode
        if (!codeEditor.activeFocus && nextCode !== chart) {
            chart = nextCode
            codeEditor.text = nextCode
        }
    }

    Timer { id: copyTimer; interval: 2000; onTriggered: mermaidRoot.copiedNotice = false }
    Timer {
        id: codeDebounce
        interval: 250
        onTriggered: {
            if (codeEditor.text !== mermaidRoot.lastSyncedCode) {
                mermaidRoot.lastSyncedCode = codeEditor.text
                mermaidRoot.codeModified(codeEditor.text)
            }
        }
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        Rectangle {
            Layout.fillWidth: true; Layout.preferredHeight: 40; color: "#1a1924"
            Rectangle { anchors.bottom: parent.bottom; anchors.left: parent.left; anchors.right: parent.right; height: 1; color: "#0dffffff" }

            RowLayout {
                anchors.fill: parent; anchors.leftMargin: 12; anchors.rightMargin: 10; spacing: 8

                Rectangle {
                    width: 24; height: 24; radius: 6; color: "#268b5cf6"; border.color: "#408b5cf6"
                    AppIcon { anchors.centerIn: parent; name: "diagrams"; color: "#c4b5fd"; width: 13; height: 13 }
                }

                Text { text: qsTr("Diagrama Mermaid"); color: "#fffffe"; font.pixelSize: 12; font.weight: Font.DemiBold }
                Item { Layout.fillWidth: true }

                Button {
                    Layout.preferredHeight: 24; leftPadding: 8; rightPadding: 8; focusPolicy: Qt.NoFocus
                    onClicked: mermaidRoot.showCode = !mermaidRoot.showCode
                    background: Rectangle { radius: 6; color: mermaidRoot.showCode ? "#268b5cf6" : (parent.hovered ? "#1affffff" : "transparent") }
                    contentItem: RowLayout {
                        spacing: 4
                        AppIcon { name: mermaidRoot.showCode ? "eye" : "code"; color: "#c4b5fd"; width: 12; height: 12 }
                        Text { text: mermaidRoot.showCode ? qsTr("Visualizar") : qsTr("Editar Código"); color: "#e2e8f0"; font.pixelSize: 11 }
                    }
                }

                ToolButton {
                    visible: !mermaidRoot.showCode; Layout.preferredWidth: 24; Layout.preferredHeight: 24; focusPolicy: Qt.NoFocus
                    onClicked: mermaidRoot.zoomLevel = Math.max(0.5, mermaidRoot.zoomLevel - 0.15)
                    background: Rectangle { radius: 5; color: parent.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "minus"; color: "#a7a9be"; width: 12; height: 12 }
                }
                Text { visible: !mermaidRoot.showCode; text: Math.round(mermaidRoot.zoomLevel * 100) + "%"; color: "#94a1b2"; font.pixelSize: 10; font.family: "monospace" }
                ToolButton {
                    visible: !mermaidRoot.showCode; Layout.preferredWidth: 24; Layout.preferredHeight: 24; focusPolicy: Qt.NoFocus
                    onClicked: mermaidRoot.zoomLevel = Math.min(2.5, mermaidRoot.zoomLevel + 0.15)
                    background: Rectangle { radius: 5; color: parent.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "plus"; color: "#a7a9be"; width: 12; height: 12 }
                }

                ToolButton {
                    Layout.preferredWidth: 24; Layout.preferredHeight: 24; focusPolicy: Qt.NoFocus
                    ToolTip.visible: hovered; ToolTip.text: mermaidRoot.copiedNotice ? qsTr("Copiado!") : qsTr("Copiar código")
                    onClicked: {
                        if (mermaidRoot.controller && typeof mermaidRoot.controller.copyToClipboard === "function") {
                            mermaidRoot.controller.copyToClipboard(mermaidRoot.chart)
                        }
                        mermaidRoot.copiedNotice = true; copyTimer.restart()
                    }
                    background: Rectangle { radius: 5; color: parent.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: mermaidRoot.copiedNotice ? "check" : "copy"; color: mermaidRoot.copiedNotice ? "#34d399" : "#a7a9be"; width: 12; height: 12 }
                }

                ToolButton {
                    Layout.preferredWidth: 24; Layout.preferredHeight: 24; focusPolicy: Qt.NoFocus
                    ToolTip.visible: hovered; ToolTip.text: qsTr("Tela cheia")
                    onClicked: mermaidRoot.fullscreenRequested(mermaidRoot.chart)
                    background: Rectangle { radius: 5; color: parent.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "maximize"; color: "#a7a9be"; width: 12; height: 12 }
                }

                ToolButton {
                    Layout.preferredWidth: 24; Layout.preferredHeight: 24; focusPolicy: Qt.NoFocus
                    ToolTip.visible: hovered; ToolTip.text: qsTr("Remover diagrama")
                    onClicked: mermaidRoot.removeRequested()
                    background: Rectangle { radius: 5; color: parent.hovered ? "#22ef4444" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: "#fb7185"; width: 12; height: 12 }
                }
            }
        }

        Item {
            Layout.fillWidth: true; Layout.fillHeight: true

            ScrollView {
                anchors.fill: parent; anchors.margins: 10; visible: mermaidRoot.showCode; clip: true
                TextArea {
                    id: codeEditor
                    text: mermaidRoot.chart; color: "#e2e8f0"; font.pixelSize: 13; font.family: "monospace"
                    background: Rectangle { radius: 6; color: "#0b0a10"; border.color: "#14ffffff" }
                    padding: 10; wrapMode: TextEdit.NoWrap
                    onTextChanged: if (activeFocus) { mermaidRoot.chart = text; codeDebounce.restart() }
                    onEditingFinished: mermaidRoot.flushPendingEdits()
                }
            }

            Flickable {
                id: diagramFlickable
                anchors.fill: parent; anchors.margins: 10
                visible: !mermaidRoot.showCode
                clip: true
                contentWidth: Math.max(width, svgImg.implicitWidth * mermaidRoot.zoomLevel)
                contentHeight: Math.max(height, svgImg.implicitHeight * mermaidRoot.zoomLevel)

                Image {
                    id: svgImg
                    anchors.centerIn: parent
                    source: mermaidRoot.renderedUri
                    width: implicitWidth > 0 ? implicitWidth * mermaidRoot.zoomLevel : 360
                    height: implicitHeight > 0 ? implicitHeight * mermaidRoot.zoomLevel : 180
                    fillMode: Image.PreserveAspectFit
                    smooth: true
                }

                Text {
                    visible: mermaidRoot.renderedUri.length === 0
                    anchors.centerIn: parent
                    text: qsTr("Escreva um diagrama Mermaid (graph TD, sequenceDiagram...)")
                    color: "#64748b"; font.pixelSize: 12
                }
            }
        }
    }
}
