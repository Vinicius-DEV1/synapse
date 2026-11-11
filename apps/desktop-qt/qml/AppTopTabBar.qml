import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: tabBarRoot
    Layout.fillWidth: true
    height: 42
    color: theme.bgDarkBg
    border.color: theme.borderSubtle
    border.width: 1

    property var openTabs: [
        { id: "tab-home", module: "home", title: "Início", icon: "home" },
        { id: "tab-notes", module: "notes", title: "Caderno", icon: "notes" }
    ]
    property string activeTabId: "tab-home"

    signal tabSelected(string tabId, string moduleKey)
    signal tabClosed(string tabId)
    signal newTabRequested()
    signal notificationRequested()
    signal minimizeRequested()
    signal maximizeRequested()
    signal closeAppRequested()

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 8
        anchors.rightMargin: 8
        spacing: 4

        // Tabs Row
        RowLayout {
            spacing: 2
            Layout.alignment: Qt.AlignBottom

            Repeater {
                model: tabBarRoot.openTabs

                delegate: Rectangle {
                    id: tabDelegate
                    property bool isActive: tabBarRoot.activeTabId === modelData.id
                    width: Math.min(180, Math.max(120, tabRow.implicitWidth + 24))
                    height: 36
                    radius: 8

                    color: tabDelegate.isActive ? theme.bgDarkBg : (tabMouse.containsMouse ? "#08ffffff" : "transparent")
                    border.color: tabDelegate.isActive ? theme.borderSubtle : "transparent"
                    border.width: 1

                    // Purple accent line on top of active tab
                    Rectangle {
                        anchors.top: parent.top
                        anchors.left: parent.left
                        anchors.right: parent.right
                        height: 2
                        radius: 1
                        color: theme.brand500
                        visible: tabDelegate.isActive
                    }

                    RowLayout {
                        id: tabRow
                        anchors.fill: parent
                        anchors.leftMargin: 10
                        anchors.rightMargin: 8
                        spacing: 6

                        AppIcon {
                            width: 14
                            height: 14
                            name: modelData.icon || "notes"
                            color: tabDelegate.isActive ? theme.brand400 : theme.textSubtext
                        }

                        Text {
                            Layout.fillWidth: true
                            text: modelData.title
                            color: tabDelegate.isActive ? theme.textDark : theme.textSubtext
                            font.pixelSize: 12
                            font.bold: tabDelegate.isActive
                            font.family: theme.fontFamily
                            elide: Text.ElideRight
                        }

                        // Close Tab Button (visible on hover or if active and > 1 tabs)
                        Rectangle {
                            width: 18; height: 18; radius: 4
                            color: closeMouse.containsMouse ? "#18ffffff" : "transparent"
                            visible: tabBarRoot.openTabs.length > 1 && (tabDelegate.isActive || tabMouse.containsMouse)

                            AppIcon {
                                anchors.centerIn: parent
                                width: 12
                                height: 12
                                name: "close"
                                color: theme.textSubtext
                            }

                            MouseArea {
                                id: closeMouse
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: tabBarRoot.tabClosed(modelData.id)
                            }
                        }
                    }

                    MouseArea {
                        id: tabMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: tabBarRoot.tabSelected(modelData.id, modelData.module)
                    }
                }
            }

            // + New Tab Button
            Rectangle {
                width: 28; height: 28; radius: 6
                color: plusMouse.containsMouse ? "#10ffffff" : "transparent"
                Layout.alignment: Qt.AlignVCenter

                Text {
                    anchors.centerIn: parent
                    text: "+"
                    color: theme.textSubtext
                    font.pixelSize: 15
                }

                MouseArea {
                    id: plusMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: tabBarRoot.newTabRequested()
                }
            }
        }

        Item { Layout.fillWidth: true } // Window dragging spacer

        // Right Utility Icons: AI Sparkles & Notifications
        RowLayout {
            spacing: 4
            Layout.alignment: Qt.AlignVCenter

            Rectangle {
                width: 28; height: 28; radius: 6
                color: dataController.unreadNotificationCount > 0 ? theme.activePillBg : (notifMouse.containsMouse ? theme.bgHover : "transparent")
                AppIcon { anchors.centerIn: parent; width: 16; height: 16; name: "bell"; color: dataController.unreadNotificationCount > 0 ? theme.brand400 : theme.textSubtext }
                Rectangle {
                    visible: dataController.unreadNotificationCount > 0
                    anchors.right: parent.right
                    anchors.top: parent.top
                    width: 14; height: 14; radius: 7
                    color: theme.brand500
                    Text { anchors.centerIn: parent; text: dataController.unreadNotificationCount > 9 ? "9+" : dataController.unreadNotificationCount.toString(); color: "white"; font.pixelSize: 8; font.bold: true }
                }
                MouseArea {
                    id: notifMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: tabBarRoot.notificationRequested()
                }
            }

            Rectangle {
                width: 28; height: 28; radius: 6
                color: aiMouse.containsMouse ? "#10ffffff" : "transparent"
                Text { anchors.centerIn: parent; text: "✨"; font.pixelSize: 13 }
                MouseArea {
                    id: aiMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                }
            }

            // Window Controls (Min, Max, Close)
            Rectangle {
                width: 28; height: 28; radius: 6
                color: minMouse.containsMouse ? "#10ffffff" : "transparent"
                Text { anchors.centerIn: parent; text: "─"; color: theme.textSubtext; font.pixelSize: 11 }
                MouseArea {
                    id: minMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: tabBarRoot.minimizeRequested()
                }
            }

            Rectangle {
                width: 28; height: 28; radius: 6
                color: maxMouse.containsMouse ? "#10ffffff" : "transparent"
                Text { anchors.centerIn: parent; text: "□"; color: theme.textSubtext; font.pixelSize: 11 }
                MouseArea {
                    id: maxMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: tabBarRoot.maximizeRequested()
                }
            }

            Rectangle {
                width: 28; height: 28; radius: 6
                color: closeAppMouse.containsMouse ? "#f43f5e" : "transparent"
                Text { anchors.centerIn: parent; text: "✕"; color: closeAppMouse.containsMouse ? "#ffffff" : theme.textSubtext; font.pixelSize: 11 }
                MouseArea {
                    id: closeAppMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: tabBarRoot.closeAppRequested()
                }
            }
        }
    }
}

