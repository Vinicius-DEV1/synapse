pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: headerRoot
    property string bundleTitle: qsTr("Documentos")
    property string groupColor: "default"
    property int itemCount: 0
    property bool isEditingTitle: false

    signal titleUpdateRequested(string nextTitle)
    signal closeRequested()

    function focusAndSelectTitle() {
        titleInput.forceActiveFocus()
        titleInput.selectAll()
    }

    Layout.fillWidth: true
    Layout.preferredHeight: 76
    color: "#14131c"
    radius: 16

    function normalizedTitle() { return String(bundleTitle || qsTr("Documentos")) }

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 20
        anchors.rightMargin: 14
        spacing: 12

        Rectangle {
            Layout.preferredWidth: 38
            Layout.preferredHeight: 38
            radius: 11
            color: headerRoot.groupColor !== "default" ? headerRoot.groupColor + "20" : "#211b35"
            border.color: headerRoot.groupColor !== "default" ? headerRoot.groupColor + "55" : "#338b5cf6"
            AppIcon { anchors.centerIn: parent; name: "layers"; color: "#a78bfa"; width: 19; height: 19 }
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: 3

            RowLayout {
                Layout.fillWidth: true
                spacing: 5

                TextField {
                    id: titleInput
                    visible: headerRoot.isEditingTitle
                    Layout.fillWidth: true
                    Layout.preferredHeight: 30
                    text: headerRoot.normalizedTitle()
                    color: "#fffffe"
                    font.pixelSize: 14
                    font.weight: Font.Medium
                    selectByMouse: true
                    background: Rectangle { color: "#55000000"; radius: 6; border.color: "#998b5cf6" }
                    onAccepted: {
                        headerRoot.titleUpdateRequested(text.trim() || qsTr("Documentos"))
                        headerRoot.isEditingTitle = false
                    }
                    Keys.onEscapePressed: function(event) {
                        event.accepted = true
                        text = headerRoot.normalizedTitle()
                        headerRoot.isEditingTitle = false
                    }
                }

                Text {
                    visible: !headerRoot.isEditingTitle
                    Layout.fillWidth: true
                    text: headerRoot.normalizedTitle()
                    color: "#fffffe"
                    font.pixelSize: 14
                    font.weight: Font.Medium
                    elide: Text.ElideRight
                }

                ToolButton {
                    id: saveTitleButton
                    visible: headerRoot.isEditingTitle
                    Accessible.name: qsTr("Salvar título do agrupamento")
                    onClicked: titleInput.accepted()
                    background: Rectangle { radius: 5; color: saveTitleButton.hovered ? "#2234d399" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "check"; color: "#34d399"; width: 14; height: 14 }
                }

                ToolButton {
                    id: renameButton
                    visible: !headerRoot.isEditingTitle
                    Accessible.name: qsTr("Renomear agrupamento")
                    onClicked: {
                        titleInput.text = headerRoot.normalizedTitle()
                        headerRoot.isEditingTitle = true
                        Qt.callLater(headerRoot.focusAndSelectTitle)
                    }
                    background: Rectangle { radius: 5; color: renameButton.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "edit"; color: "#a7a9be"; width: 13; height: 13 }
                }
            }

            Text {
                text: qsTr("Agrupamento de documentos • %1 arquivo(s)").arg(headerRoot.itemCount)
                color: "#858597"
                font.pixelSize: 10
            }
        }

        ToolButton {
            id: closeButton
            Accessible.name: qsTr("Fechar gerenciador de documentos")
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Fechar (Esc)")
            onClicked: headerRoot.closeRequested()
            background: Rectangle { radius: 8; color: closeButton.hovered ? "#1affffff" : "transparent" }
            contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: "#a7a9be"; width: 16; height: 16 }
        }
    }
}
