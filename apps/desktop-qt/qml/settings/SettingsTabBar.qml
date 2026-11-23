import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: tabBarRoot
    Layout.fillWidth: true
    Layout.preferredHeight: 48
    radius: 12
    color: theme.bgDarkCard
    border.color: theme.borderCard

    Theme { id: theme }

    property string activeTab: "general"
    signal tabSelected(string tabId)

    readonly property var tabs: [
        { id: "general", label: qsTr("Geral"), icon: "settings" },
        { id: "editor", label: qsTr("Editor"), icon: "layout" },
        { id: "security", label: qsTr("Segurança"), icon: "shield" },
        { id: "ai", label: qsTr("IA"), icon: "zap" },
        { id: "shortcuts", label: qsTr("Atalhos"), icon: "keyboard" },
        { id: "storage", label: qsTr("Armazenamento"), icon: "hard-drive" },
        { id: "video", label: qsTr("Vídeo"), icon: "video" },
        { id: "backup", label: qsTr("Backup"), icon: "backup" },
        { id: "sync", label: qsTr("Sincronização"), icon: "refresh" },
        { id: "sharing", label: qsTr("Compartilhar"), icon: "share" },
        { id: "all", label: qsTr("Todas"), icon: "notes" }
    ]

    Flickable {
        anchors.fill: parent
        anchors.margins: 4
        contentWidth: rowLayout.implicitWidth
        contentHeight: height
        clip: true
        boundsBehavior: Flickable.StopAtBounds

        RowLayout {
            id: rowLayout
            anchors.verticalCenter: parent.verticalCenter
            spacing: 4

            Repeater {
                model: tabBarRoot.tabs

                delegate: Rectangle {
                    id: tabBtn
                    property bool isActive: tabBarRoot.activeTab === modelData.id
                    implicitHeight: 38
                    implicitWidth: tabContentRow.implicitWidth + 24
                    radius: 8
                    color: isActive ? theme.brand500 : (tabMouse.containsMouse ? theme.bgHover : "transparent")

                    Behavior on color {
                        ColorAnimation { duration: 150 }
                    }

                    RowLayout {
                        id: tabContentRow
                        anchors.centerIn: parent
                        spacing: 6

                        AppIcon {
                            width: 14; height: 14
                            name: modelData.icon
                            color: tabBtn.isActive ? "#ffffff" : theme.textSubtext
                        }

                        Text {
                            text: modelData.label
                            color: tabBtn.isActive ? "#ffffff" : (tabMouse.containsMouse ? theme.textDark : theme.textSubtext)
                            font.pixelSize: 12
                            font.bold: tabBtn.isActive
                        }
                    }

                    MouseArea {
                        id: tabMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: tabBarRoot.tabSelected(modelData.id)
                    }
                }
            }
        }
    }
}
