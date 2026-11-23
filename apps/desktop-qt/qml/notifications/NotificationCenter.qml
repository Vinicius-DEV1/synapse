import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Item {
    id: centerRoot
    anchors.fill: parent
    visible: false
    z: 200

    property bool isOpen: false
    property var notifications: []
    property string currentFilter: "all"
    property bool isHelpOpen: false

    signal closed()
    signal openPage(string pageId)
    signal openCalendarRequested(string eventId)

    readonly property var filteredNotifications: {
        if (!notifications || notifications.length === 0) return []
        if (currentFilter === "all") return notifications
        if (currentFilter === "unread") {
            return notifications.filter(function(n) { return !n.is_read })
        }
        return notifications.filter(function(n) { return n.type === currentFilter })
    }

    function formatTimeAgo(dateStr) {
        if (!dateStr) return ""
        try {
            var d = new Date(dateStr)
            var diffMin = Math.floor((Date.now() - d.getTime()) / 60000)
            if (diffMin < 1) return "Agora"
            if (diffMin < 60) return "Há " + diffMin + " min"
            var diffHours = Math.floor(diffMin / 60)
            if (diffHours < 24) return "Há " + diffHours + " h"
            return d.toLocaleDateString()
        } catch (e) {
            return ""
        }
    }

    function refresh() {
        notifications = dataController.getNotifications()
    }

    function markRead(id) {
        dataController.markNotificationRead(id || "")
        refresh()
    }

    function remove(id) {
        dataController.deleteNotification(id)
        refresh()
    }

    function clearAll() {
        dataController.clearAllNotifications()
        refresh()
    }

    onIsOpenChanged: {
        visible = isOpen
        if (isOpen) refresh()
    }

    Shortcut {
        sequence: "Escape"
        enabled: centerRoot.isOpen
        onActivated: {
            if (centerRoot.isHelpOpen) {
                centerRoot.isHelpOpen = false
            } else {
                centerRoot.closed()
            }
        }
    }

    Rectangle {
        anchors.fill: parent
        color: "#99000000"

        MouseArea {
            anchors.fill: parent
            onClicked: centerRoot.closed()
        }
    }

    Rectangle {
        id: panel
        width: Math.min(460, centerRoot.width - 32)
        height: Math.min(680, centerRoot.height - 40)
        anchors.top: parent.top
        anchors.right: parent.right
        anchors.margins: 20
        radius: 16
        color: theme.bgDarkCard
        border.color: theme.borderCard

        MouseArea {
            anchors.fill: parent
            onClicked: function(mouse) { mouse.accepted = true }
        }

        ColumnLayout {
            anchors.fill: parent
            spacing: 0

            // Header Row
            RowLayout {
                Layout.fillWidth: true
                Layout.margins: 16
                spacing: 8

                AppIcon { width: 18; height: 18; name: "bell"; color: theme.brand400 }
                Text {
                    text: "Notificações"
                    color: theme.textDark
                    font.pixelSize: 16
                    font.bold: true
                    font.family: theme.fontFamily
                    Layout.fillWidth: true
                }
                Rectangle {
                    visible: dataController.unreadNotificationCount > 0
                    Layout.preferredWidth: unreadLabel.implicitWidth + 16
                    height: 22
                    radius: 11
                    color: theme.activePillBg
                    Text {
                        id: unreadLabel
                        anchors.centerIn: parent
                        text: dataController.unreadNotificationCount + " novas"
                        color: theme.brand300
                        font.pixelSize: 10
                        font.bold: true
                    }
                }
                Button {
                    visible: dataController.unreadNotificationCount > 0
                    text: "Marcar lidas"
                    onClicked: centerRoot.markRead("")
                    background: Rectangle { color: parent.hovered ? theme.bgHover : "transparent"; radius: 7 }
                    contentItem: Text { text: parent.text; color: theme.brand400; font.pixelSize: 11; verticalAlignment: Text.AlignVCenter }
                }
                Button {
                    text: "?"
                    onClicked: centerRoot.isHelpOpen = true
                    background: Rectangle { color: parent.hovered ? theme.bgHover : "transparent"; radius: 7 }
                    contentItem: Text { text: parent.text; color: theme.textSubtext; font.pixelSize: 14; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    Layout.preferredWidth: 28
                    Layout.preferredHeight: 28
                }
                Button {
                    text: "×"
                    onClicked: centerRoot.closed()
                    background: Rectangle { color: parent.hovered ? theme.bgHover : "transparent"; radius: 7 }
                    contentItem: Text { text: parent.text; color: theme.textSubtext; font.pixelSize: 20; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    Layout.preferredWidth: 28
                    Layout.preferredHeight: 28
                }
            }

            // Filter Tabs Row
            RowLayout {
                Layout.fillWidth: true
                Layout.leftMargin: 16
                Layout.rightMargin: 16
                Layout.bottomMargin: 8
                spacing: 6

                Repeater {
                    model: [
                        { id: "all", label: "Todas" },
                        { id: "unread", label: "Não lidas" },
                        { id: "calendar_event", label: "Eventos" },
                        { id: "alarm", label: "Alarmes" }
                    ]
                    delegate: Rectangle {
                        required property var modelData
                        height: 26
                        radius: 6
                        color: centerRoot.currentFilter === modelData.id ? theme.activePillBg : "transparent"
                        border.color: centerRoot.currentFilter === modelData.id ? theme.borderBrand : theme.borderSubtle
                        Layout.preferredWidth: filterLabel.implicitWidth + 14

                        Text {
                            id: filterLabel
                            anchors.centerIn: parent
                            text: modelData.label
                            color: centerRoot.currentFilter === modelData.id ? theme.brand300 : theme.textSubtext
                            font.pixelSize: 11
                            font.bold: centerRoot.currentFilter === modelData.id
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: centerRoot.currentFilter = modelData.id
                        }
                    }
                }

                Item { Layout.fillWidth: true }

                Button {
                    visible: centerRoot.notifications.length > 0
                    text: "Limpar tudo"
                    onClicked: centerRoot.clearAll()
                    background: Rectangle { color: parent.hovered ? theme.bgHover : "transparent"; radius: 6 }
                    contentItem: Text { text: parent.text; color: theme.textMuted; font.pixelSize: 10; verticalAlignment: Text.AlignVCenter }
                    Layout.preferredHeight: 24
                }
            }

            Rectangle { Layout.fillWidth: true; height: 1; color: theme.borderSubtle }

            // Notifications List
            ListView {
                id: notificationList
                Layout.fillWidth: true
                Layout.fillHeight: true
                Layout.margins: 10
                clip: true
                spacing: 8
                model: centerRoot.filteredNotifications

                delegate: Rectangle {
                    required property var modelData
                    width: notificationList.width
                    height: cardColumn.implicitHeight + 22
                    radius: 12
                    color: modelData.is_read ? "#05000000" : "#0f8b5cf6"
                    border.color: modelData.is_read ? theme.borderSubtle : theme.borderBrand

                    ColumnLayout {
                        id: cardColumn
                        anchors.fill: parent
                        anchors.margins: 11
                        spacing: 7

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 7
                            AppIcon {
                                width: 16; height: 16
                                name: modelData.type === "calendar_event" ? "calendar" : modelData.type === "alarm" ? "focus" : "bell"
                                color: modelData.type === "alarm" ? theme.warning : theme.brand400
                            }
                            Text {
                                Layout.fillWidth: true
                                text: modelData.title || "Notificação"
                                color: theme.textDark
                                font.pixelSize: 13
                                font.bold: true
                                elide: Text.ElideRight
                            }
                            Text {
                                text: centerRoot.formatTimeAgo(modelData.fired_at || modelData.created_at)
                                color: theme.textMuted
                                font.pixelSize: 10
                            }
                        }

                        Text {
                            Layout.fillWidth: true
                            text: modelData.message || ""
                            color: theme.textSubtext
                            font.pixelSize: 11
                            wrapMode: Text.Wrap
                            lineHeight: 1.25
                            lineHeightMode: Text.ProportionalHeight
                        }

                        RowLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            Button {
                                visible: Boolean(modelData.target_page_id)
                                text: "Abrir nota"
                                onClicked: centerRoot.openPage(modelData.target_page_id)
                                background: Rectangle { color: parent.hovered ? "#408b5cf6" : "#268b5cf6"; radius: 7 }
                                contentItem: Text { text: parent.text; color: theme.brand300; font.pixelSize: 10; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                                Layout.preferredHeight: 26
                            }

                            Button {
                                text: "Adiar 15 min"
                                onClicked: {
                                    dataController.snoozeNotification(modelData.id, 15, "Adiado 15m")
                                    centerRoot.refresh()
                                }
                                background: Rectangle { color: parent.hovered ? theme.bgHover : "#08ffffff"; radius: 7 }
                                contentItem: Text { text: parent.text; color: theme.textSubtext; font.pixelSize: 10; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                                Layout.preferredHeight: 26
                            }

                            Button {
                                visible: modelData.type === "calendar_event" && Boolean(modelData.event_id)
                                text: qsTr("Abrir Agenda")
                                onClicked: centerRoot.openCalendarRequested(modelData.event_id)
                                background: Rectangle { color: parent.hovered ? "#333b82f6" : "#1a3b82f6"; radius: 7 }
                                contentItem: Text { text: parent.text; color: "#93c5fd"; font.pixelSize: 10; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                                Layout.preferredHeight: 26
                            }

                            Button {
                                visible: modelData.type === "calendar_event" && Boolean(modelData.event_id)
                                text: "Concluir"
                                onClicked: {
                                    dataController.toggleEventStatus(modelData.event_id)
                                    centerRoot.markRead(modelData.id)
                                }
                                background: Rectangle { color: parent.hovered ? "#3310b981" : "#1a10b981"; radius: 7 }
                                contentItem: Text { text: parent.text; color: theme.success; font.pixelSize: 10; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                                Layout.preferredHeight: 26
                            }

                            Item { Layout.fillWidth: true }
                            Button {
                                visible: !modelData.is_read
                                text: "✓"
                                onClicked: centerRoot.markRead(modelData.id)
                                background: Rectangle { color: parent.hovered ? "#3310b981" : "transparent"; radius: 6 }
                                contentItem: Text { text: parent.text; color: theme.success; font.pixelSize: 14; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                                Layout.preferredWidth: 28
                                Layout.preferredHeight: 26
                            }
                            Button {
                                text: "×"
                                onClicked: centerRoot.remove(modelData.id)
                                background: Rectangle { color: parent.hovered ? theme.errorBg : "transparent"; radius: 6 }
                                contentItem: Text { text: parent.text; color: theme.error; font.pixelSize: 17; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                                Layout.preferredWidth: 28
                                Layout.preferredHeight: 26
                            }
                        }
                    }
                }

                footer: Item {
                    width: notificationList.width
                    height: centerRoot.filteredNotifications.length === 0 ? 180 : 0
                    visible: centerRoot.filteredNotifications.length === 0
                    Column {
                        anchors.centerIn: parent
                        spacing: 8
                        AppIcon { anchors.horizontalCenter: parent.horizontalCenter; width: 28; height: 28; name: "bell"; color: theme.textMuted }
                        Text {
                            anchors.horizontalCenter: parent.horizontalCenter
                            text: centerRoot.notifications.length === 0 ? "Tudo em dia" : "Nenhuma notificação encontrada"
                            color: theme.textDark
                            font.pixelSize: 13
                            font.bold: true
                        }
                        Text {
                            anchors.horizontalCenter: parent.horizontalCenter
                            text: centerRoot.notifications.length === 0 ? "Suas notificações aparecerão aqui." : "Nenhum item corresponde ao filtro selecionado."
                            color: theme.textMuted
                            font.pixelSize: 11
                        }
                    }
                }
            }
        }
    }

    NotificationHelpDialog {
        isOpen: centerRoot.isHelpOpen
        onClosed: centerRoot.isHelpOpen = false
    }
}
