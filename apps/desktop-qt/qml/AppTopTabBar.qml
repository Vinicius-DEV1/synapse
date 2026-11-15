pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: tabBarRoot
    Layout.fillWidth: true
    Layout.preferredHeight: 42
    height: 42
    color: theme.bgDarkBg
    border.color: theme.borderSubtle
    border.width: 1

    property var openTabs: [
        { id: "tab-home", module: "home", title: "Início", icon: "home", isPinned: false },
        { id: "tab-notes", module: "notes", title: "Caderno", icon: "notes", isPinned: false }
    ]
    property string activeTabId: "tab-home"
    property int unreadCount: 0
    property var windowRoot: null
    readonly property bool isMaximized: windowRoot ? (windowRoot.visibility === Window.Maximized) : false

    signal tabSelected(string tabId, string moduleKey)
    signal tabClosed(string tabId)
    signal tabPinToggled(string tabId)
    signal duplicateTabRequested(string tabId)
    signal closeOtherTabsRequested(string tabId)
    signal closeTabsToRightRequested(string tabId)
    signal newTabRequested()
    signal notificationRequested()
    signal minimizeRequested()
    signal maximizeRequested()
    signal closeAppRequested()

    Theme { id: theme }

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
                    required property var modelData
                    required property int index

                    Theme { id: tabTheme }

                    property bool isActive: tabBarRoot.activeTabId === tabDelegate.modelData.id
                    property bool isPinned: tabDelegate.modelData.isPinned === true
                    width: tabDelegate.isPinned ? 44 : Math.min(180, Math.max(120, tabRow.implicitWidth + 24))
                    height: 36
                    radius: 8

                    color: tabDelegate.isActive ? tabTheme.bgDarkBg : (tabMouse.containsMouse ? "#08ffffff" : "transparent")
                    border.color: tabDelegate.isActive ? tabTheme.borderSubtle : "transparent"
                    border.width: 1

                    // Purple accent line on top of active tab
                    Rectangle {
                        anchors.top: parent.top
                        anchors.left: parent.left
                        anchors.right: parent.right
                        height: 2
                        radius: 1
                        color: tabTheme.brand500
                        visible: tabDelegate.isActive
                    }

                    RowLayout {
                        id: tabRow
                        anchors.fill: parent
                        anchors.leftMargin: tabDelegate.isPinned ? 0 : 10
                        anchors.rightMargin: tabDelegate.isPinned ? 0 : 8
                        spacing: 6

                        AppIcon {
                            Layout.alignment: tabDelegate.isPinned ? Qt.AlignCenter : Qt.AlignVCenter
                            Layout.preferredWidth: 14
                            Layout.preferredHeight: 14
                            name: tabDelegate.isPinned ? "pin" : (tabDelegate.modelData.icon || "notes")
                            color: tabDelegate.isActive ? tabTheme.brand400 : tabTheme.textSubtext
                        }

                        Text {
                            visible: !tabDelegate.isPinned
                            Layout.fillWidth: true
                            text: tabDelegate.modelData.title || qsTr("Caderno")
                            color: tabDelegate.isActive ? tabTheme.textDark : tabTheme.textSubtext
                            font.pixelSize: 12
                            font.bold: tabDelegate.isActive
                            font.family: tabTheme.fontFamily
                            elide: Text.ElideRight
                        }

                        // Close Tab Button (suppressed for pinned tabs)
                        Rectangle {
                            Layout.preferredWidth: 18
                            Layout.preferredHeight: 18
                            radius: 4
                            color: closeMouse.containsMouse ? "#18ffffff" : "transparent"
                            visible: !tabDelegate.isPinned && tabBarRoot.openTabs.length > 1 && (tabDelegate.isActive || tabMouse.containsMouse)

                            AppIcon {
                                anchors.centerIn: parent
                                width: 12
                                height: 12
                                name: "close"
                                color: tabTheme.textSubtext
                            }

                            MouseArea {
                                id: closeMouse
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: tabBarRoot.tabClosed(tabDelegate.modelData.id)
                            }
                        }
                    }

                    MouseArea {
                        id: tabMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        acceptedButtons: Qt.LeftButton | Qt.RightButton
                        cursorShape: Qt.PointingHandCursor
                        onClicked: function(mouse) {
                            if (mouse.button === Qt.RightButton) {
                                tabContextMenu.targetTab = tabDelegate.modelData
                                tabContextMenu.tabCount = tabBarRoot.openTabs.length
                                tabContextMenu.hasTabsToRight = (tabDelegate.index < tabBarRoot.openTabs.length - 1)
                                var pt = tabDelegate.mapToItem(tabBarRoot, mouse.x, mouse.y)
                                tabContextMenu.x = Math.max(8, Math.min(pt.x, tabBarRoot.width - 200))
                                tabContextMenu.y = Math.max(8, pt.y + 4)
                                tabContextMenu.open()
                            } else {
                                tabBarRoot.tabSelected(tabDelegate.modelData.id, tabDelegate.modelData.module)
                            }
                        }
                    }
                }
            }

            // + New Tab Button
            Rectangle {
                Layout.preferredWidth: 28
                Layout.preferredHeight: 28
                radius: 6
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

        // Window dragging spacer
        Item {
            id: dragSpacer
            Layout.fillWidth: true
            Layout.fillHeight: true

            MouseArea {
                anchors.fill: parent
                acceptedButtons: Qt.LeftButton
                onPressed: {
                    if (tabBarRoot.windowRoot && typeof tabBarRoot.windowRoot.startSystemMove === "function") {
                        tabBarRoot.windowRoot.startSystemMove()
                    }
                }
                onDoubleClicked: tabBarRoot.maximizeRequested()
            }
        }

        // Right Utility Icons: AI Sparkles, Notifications & Window Controls
        RowLayout {
            spacing: 4
            Layout.alignment: Qt.AlignVCenter

            Rectangle {
                Layout.preferredWidth: 28
                Layout.preferredHeight: 28
                radius: 6
                color: tabBarRoot.unreadCount > 0 ? theme.activePillBg : (notifMouse.containsMouse ? theme.bgHover : "transparent")
                ToolTip.text: qsTr("Notificações")
                ToolTip.visible: notifMouse.containsMouse
                ToolTip.delay: 400
                AppIcon {
                    anchors.centerIn: parent
                    width: 16
                    height: 16
                    name: "bell"
                    color: tabBarRoot.unreadCount > 0 ? theme.brand400 : theme.textSubtext
                }
                Rectangle {
                    visible: tabBarRoot.unreadCount > 0
                    anchors.right: parent.right
                    anchors.top: parent.top
                    width: 14; height: 14; radius: 7
                    color: theme.brand500
                    Text {
                        anchors.centerIn: parent
                        text: tabBarRoot.unreadCount > 9 ? "9+" : tabBarRoot.unreadCount.toString()
                        color: "white"
                        font.pixelSize: 8
                        font.bold: true
                    }
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
                Layout.preferredWidth: 28
                Layout.preferredHeight: 28
                radius: 6
                color: aiMouse.containsMouse ? "#10ffffff" : "transparent"
                ToolTip.text: qsTr("Assistente IA")
                ToolTip.visible: aiMouse.containsMouse
                ToolTip.delay: 400
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
                Layout.preferredWidth: 28
                Layout.preferredHeight: 28
                radius: 6
                color: minMouse.containsMouse ? "#1affffff" : "transparent"
                ToolTip.text: qsTr("Minimizar")
                ToolTip.visible: minMouse.containsMouse
                ToolTip.delay: 400
                Text {
                    anchors.centerIn: parent
                    text: "─"
                    color: minMouse.containsMouse ? "#ffffff" : theme.textSubtext
                    font.pixelSize: 11
                }
                MouseArea {
                    id: minMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: tabBarRoot.minimizeRequested()
                }
            }

            Rectangle {
                Layout.preferredWidth: 28
                Layout.preferredHeight: 28
                radius: 6
                color: maxMouse.containsMouse ? "#1affffff" : "transparent"
                ToolTip.text: tabBarRoot.isMaximized ? qsTr("Restaurar") : qsTr("Maximizar")
                ToolTip.visible: maxMouse.containsMouse
                ToolTip.delay: 400
                Text {
                    anchors.centerIn: parent
                    text: tabBarRoot.isMaximized ? "❐" : "□"
                    color: maxMouse.containsMouse ? "#ffffff" : theme.textSubtext
                    font.pixelSize: 11
                }
                MouseArea {
                    id: maxMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: tabBarRoot.maximizeRequested()
                }
            }

            Rectangle {
                Layout.preferredWidth: 28
                Layout.preferredHeight: 28
                radius: 6
                color: closeAppMouse.containsMouse ? "#e11d48" : "transparent"
                ToolTip.text: qsTr("Fechar")
                ToolTip.visible: closeAppMouse.containsMouse
                ToolTip.delay: 400
                Text {
                    anchors.centerIn: parent
                    text: "✕"
                    color: closeAppMouse.containsMouse ? "#ffffff" : theme.textSubtext
                    font.pixelSize: 11
                }
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

    AppTabContextMenu {
        id: tabContextMenu
        onPinToggled: function(tabId) { tabBarRoot.tabPinToggled(tabId) }
        onNewTabRequested: tabBarRoot.newTabRequested()
        onDuplicateRequested: function(tabId) { tabBarRoot.duplicateTabRequested(tabId) }
        onCloseRequested: function(tabId) { tabBarRoot.tabClosed(tabId) }
        onCloseOthersRequested: function(tabId) { tabBarRoot.closeOtherTabsRequested(tabId) }
        onCloseToRightRequested: function(tabId) { tabBarRoot.closeTabsToRightRequested(tabId) }
    }
}
