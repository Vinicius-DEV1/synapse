import QtQuick 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: destinationRow
    property var target: ({})
    property string searchText: ""
    property string selectedTargetId: ""
    property string sourcePageId: ""
    property var expandedIds: ({})

    signal destinationSelected(string targetId)
    signal expandRequested(string targetId)
    signal destinationActivated(string targetId)

    objectName: target.targetId === "" ? "movePageRootTarget" : "movePageTarget-" + target.targetId
    radius: 8
    opacity: target.invalid ? 0.35 : 1.0
    color: selectedTargetId === target.targetId ? theme.activePillBg
         : (rowMouse.containsMouse && !target.invalid ? theme.bgHover : "transparent")
    border.color: selectedTargetId === target.targetId ? theme.activePillBorder : "transparent"

    Theme { id: theme }

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 8 + destinationRow.target.depth * 18
        anchors.rightMargin: 8
        spacing: 6

        Rectangle {
            Layout.preferredWidth: destinationRow.target.targetId === "" ? 30 : 20
            Layout.preferredHeight: destinationRow.target.targetId === "" ? 30 : 20
            radius: destinationRow.target.targetId === "" ? 8 : 4
            color: destinationRow.target.targetId === ""
                   ? (destinationRow.selectedTargetId === "" ? theme.brand500 : theme.bgHover)
                   : "transparent"
            visible: destinationRow.searchText.length === 0

            AppIcon {
                anchors.centerIn: parent
                visible: destinationRow.target.targetId === "" || destinationRow.target.hasChildren
                name: destinationRow.target.targetId === ""
                      ? "layout-grid"
                      : (destinationRow.expandedIds[destinationRow.target.targetId] ? "chevron-down" : "chevron-right")
                color: destinationRow.target.targetId === "" ? theme.textDark : theme.textMuted
                width: destinationRow.target.targetId === "" ? 16 : 12
                height: destinationRow.target.targetId === "" ? 16 : 12
            }

            MouseArea {
                anchors.fill: parent
                enabled: destinationRow.target.hasChildren
                cursorShape: Qt.PointingHandCursor
                onClicked: destinationRow.expandRequested(destinationRow.target.targetId)
            }
        }

        Text {
            visible: destinationRow.target.targetId !== ""
            text: destinationRow.target.icon
            font.pixelSize: 14
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: 0
            Text {
                Layout.fillWidth: true
                text: destinationRow.target.targetId === "" ? qsTr("Raiz") : destinationRow.target.title
                color: theme.textDark
                font.pixelSize: destinationRow.target.targetId === "" ? 14 : 13
                font.weight: destinationRow.target.targetId === "" ? Font.DemiBold : Font.Normal
                elide: Text.ElideRight
            }
            Text {
                Layout.fillWidth: true
                visible: destinationRow.target.targetId === ""
                text: qsTr("Página Principal de 1º Nível")
                color: theme.textMuted
                font.pixelSize: 10
                elide: Text.ElideRight
            }
            Text {
                Layout.fillWidth: true
                visible: destinationRow.target.breadcrumb.length > 0 && destinationRow.searchText.length > 0
                text: destinationRow.target.breadcrumb
                color: theme.textMuted
                font.pixelSize: 10
                elide: Text.ElideRight
            }
        }

        Text {
            visible: destinationRow.target.isCurrent
            text: qsTr("Local Atual")
            color: theme.textMuted
            font.pixelSize: 10
        }
        Text {
            visible: destinationRow.target.targetId === destinationRow.sourcePageId && !destinationRow.target.isCurrent
            text: qsTr("Página Alvo")
            color: theme.textMuted
            font.pixelSize: 10
        }
        AppIcon {
            visible: destinationRow.selectedTargetId === destinationRow.target.targetId
            name: "check"
            color: theme.brand300
            Layout.preferredWidth: 16
            Layout.preferredHeight: 16
        }
    }

    MouseArea {
        id: rowMouse
        anchors.fill: parent
        anchors.leftMargin: destinationRow.searchText.length === 0 && destinationRow.target.hasChildren
                            ? 28 + destinationRow.target.depth * 18 : 0
        hoverEnabled: true
        enabled: !destinationRow.target.invalid
        cursorShape: destinationRow.target.invalid ? Qt.ForbiddenCursor : Qt.PointingHandCursor
        onClicked: destinationRow.destinationSelected(destinationRow.target.targetId)
        onDoubleClicked: destinationRow.destinationActivated(destinationRow.target.targetId)
    }
}
