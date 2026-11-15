pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "."

Rectangle {
    id: tabBarRoot
    Layout.fillWidth: true
    Layout.preferredHeight: 46
    height: 46
    color: "#0e0d15"
    border.color: "#14ffffff"
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
    signal aiAssistantRequested()
    signal minimizeRequested()
    signal maximizeRequested()
    signal closeAppRequested()

    Theme { id: theme }

    // Background drag area for frameless window moving & double-click maximize
    MouseArea {
        anchors.fill: parent
        z: 0
        acceptedButtons: Qt.LeftButton
        onPressed: {
            if (tabBarRoot.windowRoot && typeof tabBarRoot.windowRoot.startSystemMove === "function") {
                tabBarRoot.windowRoot.startSystemMove()
            }
        }
        onDoubleClicked: tabBarRoot.maximizeRequested()
    }

    // Fixed Pinned Utility Section (Right edge - Never hidden or overlapped)
    RowLayout {
        id: rightUtilitySection
        anchors.right: parent.right
        anchors.rightMargin: 8
        anchors.verticalCenter: parent.verticalCenter
        spacing: 4
        z: 20

        // Notification Bell Button
        Rectangle {
            id: notifBtn
            Layout.preferredWidth: 28
            Layout.preferredHeight: 28
            radius: 6
            color: tabBarRoot.unreadCount > 0 ? theme.activePillBg : (notifMouse.containsMouse ? "#14ffffff" : "transparent")
            ToolTip.text: qsTr("Notificações")
            ToolTip.visible: notifMouse.containsMouse
            ToolTip.delay: 300

            AppIcon {
                anchors.centerIn: parent
                width: 15
                height: 15
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

        // AI Assistant Button
        Rectangle {
            id: aiBtn
            Layout.preferredWidth: 28
            Layout.preferredHeight: 28
            radius: 6
            color: aiMouse.containsMouse ? "#14ffffff" : "transparent"
            ToolTip.text: qsTr("Assistente IA")
            ToolTip.visible: aiMouse.containsMouse
            ToolTip.delay: 300

            Text {
                anchors.centerIn: parent
                text: "✨"
                font.pixelSize: 13
            }

            MouseArea {
                id: aiMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: tabBarRoot.aiAssistantRequested()
            }
        }

        // Divider Line
        Rectangle {
            Layout.preferredWidth: 1
            Layout.preferredHeight: 16
            Layout.leftMargin: 2
            Layout.rightMargin: 2
            color: "#18ffffff"
        }

        // Desktop Window Controls (Min, Max/Restore, Close)
        WindowControls {
            isMaximized: tabBarRoot.isMaximized
            onMinimizeClicked: tabBarRoot.minimizeRequested()
            onMaximizeClicked: tabBarRoot.maximizeRequested()
            onCloseClicked: tabBarRoot.closeAppRequested()
        }
    }

    // Scrollable Tab Strip Container (Bounded between left edge and window controls)
    Item {
        id: tabStripArea
        anchors.left: parent.left
        anchors.leftMargin: 6
        anchors.right: rightUtilitySection.left
        anchors.rightMargin: 10
        anchors.top: parent.top
        anchors.bottom: parent.bottom
        clip: true

        Flickable {
            id: tabFlickable
            anchors.fill: parent
            contentWidth: tabsRow.width
            contentHeight: height
            flickableDirection: Flickable.HorizontalFlick
            boundsBehavior: Flickable.StopAtBounds
            clip: true

            WheelHandler {
                target: tabFlickable
                onWheel: function(event) {
                    var delta = event.angleDelta.y !== 0 ? event.angleDelta.y : event.angleDelta.x
                    tabFlickable.contentX = Math.max(0, Math.min(tabFlickable.contentWidth - tabFlickable.width, tabFlickable.contentX - delta))
                }
            }

            Row {
                id: tabsRow
                height: parent.height
                spacing: 3

                Repeater {
                    model: tabBarRoot.openTabs

                    delegate: Rectangle {
                        id: tabDelegate
                        required property var modelData
                        required property int index

                        Theme { id: tabTheme }

                        readonly property bool isActive: tabBarRoot.activeTabId === tabDelegate.modelData.id
                        readonly property bool isPinned: tabDelegate.modelData.isPinned === true

                        width: tabDelegate.isPinned ? 42 : Math.min(220, Math.max(120, tabContentRow.implicitWidth + 24))
                        height: 38
                        anchors.bottom: parent.bottom
                        radius: 8

                        color: tabDelegate.isActive ? "#0f0e17" : (tabMouse.containsMouse ? "#0fffffff" : "transparent")
                        border.color: tabDelegate.isActive ? "#1affffff" : "transparent"
                        border.width: 1

                        // Active Tab Purple Accent Bar
                        Rectangle {
                            anchors.top: parent.top
                            anchors.left: parent.left
                            anchors.right: parent.right
                            height: 2
                            radius: 1
                            color: tabTheme.brand500
                            visible: tabDelegate.isActive
                        }

                        // Tab Content
                        RowLayout {
                            id: tabContentRow
                            anchors.fill: parent
                            anchors.leftMargin: tabDelegate.isPinned ? 0 : 10
                            anchors.rightMargin: tabDelegate.isPinned ? 0 : 8
                            spacing: 6
                            z: 2

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

                            // Close Button (z: 5 ensures it receives clicks above tabMouse)
                            Rectangle {
                                id: closeBtnRect
                                z: 5
                                Layout.preferredWidth: 18
                                Layout.preferredHeight: 18
                                radius: 4
                                color: closeMouse.containsMouse ? "#20ffffff" : "transparent"
                                visible: !tabDelegate.isPinned && tabBarRoot.openTabs.length > 1 && (tabDelegate.isActive || tabMouse.containsMouse)
                                ToolTip.text: qsTr("Fechar aba")
                                ToolTip.visible: closeMouse.containsMouse
                                ToolTip.delay: 300

                                Text {
                                    anchors.centerIn: parent
                                    text: "✕"
                                    font.pixelSize: 10
                                    color: closeMouse.containsMouse ? "#ffffff" : tabTheme.textSubtext
                                }

                                MouseArea {
                                    id: closeMouse
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: function(mouse) {
                                        mouse.accepted = true
                                        tabBarRoot.tabClosed(tabDelegate.modelData.id)
                                    }
                                }
                            }
                        }

                        // Tab Click / Context Menu Area
                        MouseArea {
                            id: tabMouse
                            anchors.fill: parent
                            z: 1
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

                // New Tab Button "+"
                Rectangle {
                    id: plusBtn
                    width: 28
                    height: 28
                    radius: 6
                    anchors.bottom: parent.bottom
                    anchors.bottomMargin: 5
                    color: plusMouse.containsMouse ? "#14ffffff" : "transparent"
                    ToolTip.text: qsTr("Nova aba (Ctrl+T)")
                    ToolTip.visible: plusMouse.containsMouse
                    ToolTip.delay: 300

                    Text {
                        anchors.centerIn: parent
                        text: "+"
                        color: plusMouse.containsMouse ? "#c4b5fd" : theme.textSubtext
                        font.pixelSize: 16
                        font.bold: true
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
        }

        // Left Scroll Chevron Overlay
        Rectangle {
            id: leftChevron
            anchors.left: parent.left
            anchors.verticalCenter: parent.verticalCenter
            width: 22
            height: 26
            radius: 5
            color: leftMouse.containsMouse ? "#28253a" : "#161524"
            border.color: "#33ffffff"
            border.width: 1
            visible: tabFlickable.contentX > 4
            z: 15

            Text {
                anchors.centerIn: parent
                text: "‹"
                color: "#ffffff"
                font.pixelSize: 15
                font.bold: true
            }

            MouseArea {
                id: leftMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: tabFlickable.contentX = Math.max(0, tabFlickable.contentX - 200)
            }
        }

        // Right Scroll Chevron Overlay
        Rectangle {
            id: rightChevron
            anchors.right: parent.right
            anchors.verticalCenter: parent.verticalCenter
            width: 22
            height: 26
            radius: 5
            color: rightMouse.containsMouse ? "#28253a" : "#161524"
            border.color: "#33ffffff"
            border.width: 1
            visible: tabFlickable.contentWidth > tabFlickable.width && tabFlickable.contentX < (tabFlickable.contentWidth - tabFlickable.width - 4)
            z: 15

            Text {
                anchors.centerIn: parent
                text: "›"
                color: "#ffffff"
                font.pixelSize: 15
                font.bold: true
            }

            MouseArea {
                id: rightMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: tabFlickable.contentX = Math.min(tabFlickable.contentWidth - tabFlickable.width, tabFlickable.contentX + 200)
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
