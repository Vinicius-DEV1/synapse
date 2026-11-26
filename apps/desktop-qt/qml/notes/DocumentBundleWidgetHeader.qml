pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

RowLayout {
    id: headerRoot
    property var items: []
    property var uniqueExtensions: []
    property string title: qsTr("Documentos")
    property bool renaming: false
    property bool itemsInvalid: false

    signal titleClicked()
    signal renameRequested()
    signal titleSaveRequested(string nextTitle)
    signal renameCanceled()

    function focusRenameInput() {
        renameInput.forceActiveFocus()
        renameInput.selectAll()
    }

    function cancelRename() {
        renameInput.text = headerRoot.title
        renameCanceled()
    }

    Layout.fillWidth: true
    spacing: 8

    HoverHandler { id: titleHover }

    Item {
        Layout.preferredWidth: 32
        Layout.preferredHeight: 32
        Layout.rightMargin: 2

        Rectangle {
            anchors.fill: parent
            radius: 8
            color: "#0f0e17"
            border.color: "#0dffffff"
            border.width: 1
            AppIcon { anchors.centerIn: parent; name: "layers"; color: "#a78bfa"; width: 16; height: 16 }
        }

        Rectangle {
            anchors.top: parent.top
            anchors.right: parent.right
            anchors.topMargin: -4
            anchors.rightMargin: -5
            height: 15
            width: Math.max(15, countText.implicitWidth + 6)
            radius: 7.5
            color: "#8b5cf6"
            Text {
                id: countText
                anchors.centerIn: parent
                text: String(headerRoot.items.length)
                color: "#ffffff"
                font.pixelSize: 9
                font.family: "monospace"
                font.bold: true
            }
        }
    }

    RowLayout {
        visible: headerRoot.renaming && !headerRoot.itemsInvalid
        Layout.fillWidth: true
        spacing: 4

        TextField {
            id: renameInput
            Layout.preferredWidth: 200
            Layout.preferredHeight: 26
            text: headerRoot.title
            color: "#fffffe"
            font.pixelSize: 12
            font.weight: Font.Medium
            leftPadding: 6
            rightPadding: 6
            background: Rectangle { radius: 4; color: "#66000000"; border.color: "#cc8b5cf6"; border.width: 1 }
            onAccepted: headerRoot.titleSaveRequested(text.trim() || qsTr("Documentos"))
            Keys.onEscapePressed: function(event) {
                event.accepted = true
                headerRoot.cancelRename()
            }
            onVisibleChanged: {
                if (visible) {
                    text = headerRoot.title
                    Qt.callLater(headerRoot.focusRenameInput)
                }
            }
        }

        ToolButton {
            id: saveTitleButton
            Layout.preferredWidth: 22
            Layout.preferredHeight: 22
            focusPolicy: Qt.NoFocus
            Accessible.name: qsTr("Salvar título do agrupamento")
            onClicked: renameInput.accepted()
            background: Rectangle { radius: 4; color: saveTitleButton.hovered ? "#3310b981" : "transparent" }
            contentItem: AppIcon { anchors.centerIn: parent; name: "check"; color: "#34d399"; width: 13; height: 13 }
        }

        ToolButton {
            id: cancelTitleButton
            Layout.preferredWidth: 22
            Layout.preferredHeight: 22
            focusPolicy: Qt.NoFocus
            Accessible.name: qsTr("Cancelar renomeação do agrupamento")
            onClicked: headerRoot.cancelRename()
            background: Rectangle { radius: 4; color: cancelTitleButton.hovered ? "#1affffff" : "transparent" }
            contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: "#a7a9be"; width: 12; height: 12 }
        }
    }

    RowLayout {
        visible: !headerRoot.renaming || headerRoot.itemsInvalid
        Layout.fillWidth: true
        spacing: 8

        Text {
            Layout.fillWidth: true
            text: headerRoot.title
            color: titleHover.hovered ? "#ffffff" : "#f4f4f5"
            font.pixelSize: 12
            font.weight: Font.Medium
            elide: Text.ElideRight

            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: headerRoot.titleClicked()
                onDoubleClicked: headerRoot.renameRequested()
            }
        }

        RowLayout {
            spacing: 4
            Repeater {
                model: headerRoot.uniqueExtensions
                delegate: Rectangle {
                    id: extensionBadge
                    required property string modelData
                    Layout.preferredHeight: 18
                    Layout.preferredWidth: extensionText.implicitWidth + 8
                    radius: 4
                    color: "#0dffffff"
                    border.color: "#0dffffff"
                    border.width: 1
                    Text {
                        id: extensionText
                        anchors.centerIn: parent
                        text: extensionBadge.modelData
                        color: "#a1a1aa"
                        font.pixelSize: 9
                        font.family: "monospace"
                    }
                }
            }
        }
    }

    Text {
        visible: headerRoot.itemsInvalid
        text: qsTr("Itens salvos inválidos; edição bloqueada para preservar os dados.")
        color: "#fbbf24"
        font.pixelSize: 10
        wrapMode: Text.Wrap
        Layout.fillWidth: true
    }
}
