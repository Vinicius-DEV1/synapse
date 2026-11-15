pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Rectangle {
    id: sidebarRoot
    width: 240
    color: "#16161e"
    border.color: "#2e2e38"
    border.width: 1

    property var groups: []
    property string selectedGroupId: ""
    property string viewMode: "items" // "items" or "security"
    property int allItemsCount: 0

    signal selectGroup(string groupId)
    signal setViewMode(string mode)
    signal createGroupRequested()
    signal editGroupRequested(var group)
    signal deleteGroupRequested(var group)
    signal helpRequested()

    property var contextGroup: null

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        // Header
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 52
            color: "transparent"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 16
                anchors.rightMargin: 12
                spacing: 8

                AppIcon {
                    name: "shield"
                    color: "#7c3aed"
                    Layout.preferredWidth: 18
                    Layout.preferredHeight: 18
                }

                Text {
                    text: "Cofre"
                    color: "#fffffe"
                    font.pixelSize: 14
                    font.weight: Font.Bold
                    Layout.fillWidth: true
                }

                // Help Button
                Rectangle {
                    Layout.preferredWidth: 28
                    Layout.preferredHeight: 28
                    radius: 6
                    color: helpMouse.containsMouse ? "#2e2e38" : "transparent"

                    AppIcon {
                        anchors.centerIn: parent
                        name: "help"
                        color: "#a7a9be"
                        Layout.preferredWidth: 14
                        Layout.preferredHeight: 14
                    }

                    MouseArea {
                        id: helpMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: sidebarRoot.helpRequested()
                    }
                }

                // New Group Button
                Rectangle {
                    Layout.preferredWidth: 28
                    Layout.preferredHeight: 28
                    radius: 6
                    color: addMouse.containsMouse ? "#2e2e38" : "transparent"

                    AppIcon {
                        anchors.centerIn: parent
                        name: "plus"
                        color: "#a7a9be"
                        Layout.preferredWidth: 14
                        Layout.preferredHeight: 14
                    }

                    MouseArea {
                        id: addMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: sidebarRoot.createGroupRequested()
                    }
                }
            }

            Rectangle {
                anchors.bottom: parent.bottom
                width: parent.width
                height: 1
                color: "#2e2e38"
            }
        }

        // Navigation Sections
        ScrollView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            contentWidth: parent.width
            clip: true

            ColumnLayout {
                width: parent.width
                spacing: 2

                Item { Layout.preferredHeight: 6 }

                // All Items Nav Button
                Rectangle {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 38
                    color: (sidebarRoot.viewMode === "items" && !sidebarRoot.selectedGroupId) ? "#281b38" : (allMouse.containsMouse ? "#1c1c27" : "transparent")

                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 16
                        anchors.rightMargin: 12
                        spacing: 10

                        AppIcon {
                            name: "key"
                            color: (sidebarRoot.viewMode === "items" && !sidebarRoot.selectedGroupId) ? "#a78bfa" : "#a7a9be"
                            Layout.preferredWidth: 16
                            Layout.preferredHeight: 16
                        }

                        Text {
                            text: "Todos os Itens"
                            color: (sidebarRoot.viewMode === "items" && !sidebarRoot.selectedGroupId) ? "#fffffe" : "#a7a9be"
                            font.pixelSize: 13
                            font.weight: (sidebarRoot.viewMode === "items" && !sidebarRoot.selectedGroupId) ? Font.DemiBold : Font.Normal
                            Layout.fillWidth: true
                        }
                    }

                    Rectangle {
                        visible: sidebarRoot.viewMode === "items" && !sidebarRoot.selectedGroupId
                        anchors.right: parent.right
                        anchors.top: parent.top
                        anchors.bottom: parent.bottom
                        width: 3
                        color: "#7c3aed"
                    }

                    MouseArea {
                        id: allMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            sidebarRoot.setViewMode("items")
                            sidebarRoot.selectGroup("")
                        }
                    }
                }

                // Security Dashboard Nav Button
                Rectangle {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 38
                    color: sidebarRoot.viewMode === "security" ? "#281b38" : (secMouse.containsMouse ? "#1c1c27" : "transparent")

                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 16
                        anchors.rightMargin: 12
                        spacing: 10

                        AppIcon {
                            name: "shield"
                            color: sidebarRoot.viewMode === "security" ? "#a78bfa" : "#a7a9be"
                            Layout.preferredWidth: 16
                            Layout.preferredHeight: 16
                        }

                        Text {
                            text: "Painel de Segurança"
                            color: sidebarRoot.viewMode === "security" ? "#fffffe" : "#a7a9be"
                            font.pixelSize: 13
                            font.weight: sidebarRoot.viewMode === "security" ? Font.DemiBold : Font.Normal
                            Layout.fillWidth: true
                        }
                    }

                    Rectangle {
                        visible: sidebarRoot.viewMode === "security"
                        anchors.right: parent.right
                        anchors.top: parent.top
                        anchors.bottom: parent.bottom
                        width: 3
                        color: "#7c3aed"
                    }

                    MouseArea {
                        id: secMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: sidebarRoot.setViewMode("security")
                    }
                }

                // Groups Section Header
                RowLayout {
                    Layout.fillWidth: true
                    Layout.leftMargin: 16
                    Layout.rightMargin: 12
                    Layout.topMargin: 16
                    Layout.bottomMargin: 6

                    Text {
                        text: "GRUPOS"
                        color: "#6b7280"
                        font.pixelSize: 11
                        font.weight: Font.Bold
                        Layout.fillWidth: true
                    }
                }

                // Groups List
                Repeater {
                    model: sidebarRoot.groups

                    delegate: Rectangle {
                        id: grpDelegate
                        required property var modelData
                        required property int index

                        readonly property bool isSelected: sidebarRoot.viewMode === "items" && sidebarRoot.selectedGroupId === (grpDelegate.modelData.id || "")

                        Layout.fillWidth: true
                        Layout.preferredHeight: 36
                        color: isSelected ? "#281b38" : (grpMouse.containsMouse ? "#1c1c27" : "transparent")

                        RowLayout {
                            anchors.fill: parent
                            anchors.leftMargin: 16
                            anchors.rightMargin: 8
                            spacing: 10

                            AppIcon {
                                name: "folder"
                                color: grpDelegate.modelData.color || "#3b82f6"
                                Layout.preferredWidth: 15
                                Layout.preferredHeight: 15
                            }

                            Text {
                                text: grpDelegate.modelData.name || "Grupo"
                                color: grpDelegate.isSelected ? "#fffffe" : "#a7a9be"
                                font.pixelSize: 13
                                font.weight: grpDelegate.isSelected ? Font.DemiBold : Font.Normal
                                elide: Text.ElideRight
                                Layout.fillWidth: true
                            }

                            // Options Menu Trigger
                            Rectangle {
                                Layout.preferredWidth: 24
                                Layout.preferredHeight: 24
                                radius: 4
                                visible: grpMouse.containsMouse || optMouse.containsMouse
                                color: optMouse.containsMouse ? "#2e2e38" : "transparent"

                                AppIcon {
                                    anchors.centerIn: parent
                                    name: "more-vertical"
                                    color: "#9ca3af"
                                    Layout.preferredWidth: 14
                                    Layout.preferredHeight: 14
                                }

                                MouseArea {
                                    id: optMouse
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        sidebarRoot.contextGroup = grpDelegate.modelData
                                        groupMenu.popup()
                                    }
                                }
                            }
                        }

                        Rectangle {
                            visible: grpDelegate.isSelected
                            anchors.right: parent.right
                            anchors.top: parent.top
                            anchors.bottom: parent.bottom
                            width: 3
                            color: "#7c3aed"
                        }

                        MouseArea {
                            id: grpMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            acceptedButtons: Qt.LeftButton | Qt.RightButton
                            onClicked: function(mouse) {
                                if (mouse.button === Qt.RightButton) {
                                    sidebarRoot.contextGroup = grpDelegate.modelData
                                    groupMenu.popup()
                                } else {
                                    sidebarRoot.setViewMode("items")
                                    sidebarRoot.selectGroup(grpDelegate.modelData.id || "")
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Context Menu for Group Options
    Menu {
        id: groupMenu
        background: Rectangle {
            color: "#16161e"
            border.color: "#2e2e38"
            border.width: 1
            radius: 8
        }

        Action {
            text: "Editar Grupo"
            onTriggered: {
                if (sidebarRoot.contextGroup) {
                    sidebarRoot.editGroupRequested(sidebarRoot.contextGroup)
                }
            }
        }

        Action {
            text: "Excluir Grupo"
            onTriggered: {
                if (sidebarRoot.contextGroup) {
                    sidebarRoot.deleteGroupRequested(sidebarRoot.contextGroup)
                }
            }
        }
    }
}
