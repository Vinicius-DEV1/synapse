import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: feedContainer
    radius: 12
    color: "#161524"
    border.color: "#2e2b44"
    border.width: 1
    clip: true

    property var events: []
    property string taskFilter: "all" // "all" | "tasks"
    property string activeStatusFilter: "all"
    property string searchText: ""

    signal editRequested(var eventData)
    signal toggleStatusRequested(string eventId, string currentStatus)
    signal searchChanged(string text)
    signal statusFilterSelected(string status)

    readonly property string todayStr: Qt.formatDate(new Date(), "yyyy-MM-dd")

    function getEventDayStr(dateStr) {
        if (!dateStr || dateStr.length < 10) return ""
        return dateStr.substring(0, 10)
    }

    function getEventTimeStr(dateStr) {
        if (!dateStr || dateStr.length < 16) return ""
        var timePart = dateStr.indexOf("T") !== -1 ? dateStr.substring(dateStr.indexOf("T") + 1) : ""
        if (timePart.length >= 5) {
            return timePart.substring(0, 5)
        }
        return ""
    }

    function isTaskEvent(ev) {
        var type = ev.event_type || ev.type || "event"
        return type === "task"
    }

    function getTodayEvents() {
        var res = []
        var tStr = feedContainer.todayStr
        for (var i = 0; i < feedContainer.events.length; i++) {
            var ev = feedContainer.events[i]
            if (feedContainer.taskFilter === "tasks" && !isTaskEvent(ev)) continue
            var sDate = ev.start_date || ev.start_time || ""
            if (getEventDayStr(sDate) === tStr) {
                res.push(ev)
            }
        }
        return res
    }

    function getUpcomingEvents() {
        var res = []
        var tStr = feedContainer.todayStr
        for (var i = 0; i < feedContainer.events.length; i++) {
            var ev = feedContainer.events[i]
            if (feedContainer.taskFilter === "tasks" && !isTaskEvent(ev)) continue
            var sDate = ev.start_date || ev.start_time || ""
            var dayStr = getEventDayStr(sDate)
            if (dayStr > tStr) {
                res.push(ev)
            }
        }
        res.sort(function(a, b) {
            var da = a.start_date || a.start_time || ""
            var db = b.start_date || b.start_time || ""
            return da.localeCompare(db)
        })
        return res
    }

    property var todayList: []
    property var upcomingList: []

    function refreshLists() {
        todayList = getTodayEvents()
        upcomingList = getUpcomingEvents()
    }

    onEventsChanged: refreshLists()
    onTaskFilterChanged: refreshLists()
    Component.onCompleted: refreshLists()

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        // Header with Search & Status Filters (moved from CalendarHeader for web parity)
        Rectangle {
            Layout.fillWidth: true
            height: 158
            color: "transparent"

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 14
                spacing: 8

                Text {
                    text: qsTr("Agenda")
                    color: "#fffffe"
                    font.pixelSize: 16
                    font.bold: true
                }

                // Search bar inside Agenda feed
                Rectangle {
                    Layout.fillWidth: true
                    height: 32
                    radius: 8
                    color: "#11101a"
                    border.color: feedSearchInput.activeFocus ? "#803b82f6" : "#22ffffff"
                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 10
                        anchors.rightMargin: 10
                        spacing: 6
                        Text { text: "🔍"; color: "#94a1b2"; font.pixelSize: 11 }
                        TextInput {
                            id: feedSearchInput
                            Layout.fillWidth: true
                            color: "#fffffe"
                            font.pixelSize: 12
                            selectByMouse: true
                            text: feedContainer.searchText
                            onTextChanged: feedContainer.searchChanged(text)
                            Text {
                                anchors.verticalCenter: parent.verticalCenter
                                text: qsTr("Buscar compromisso...")
                                color: "#64748b"
                                font.pixelSize: 12
                                visible: !feedSearchInput.text && !feedSearchInput.activeFocus
                            }
                        }
                    }
                }

                // Status Filter Pills (Todos / Pendentes / Concluídos)
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 4
                    Repeater {
                        model: [
                            { id: "all", label: qsTr("Todos"), color: "#fffffe" },
                            { id: "pending", label: qsTr("Pendentes"), color: "#38bdf8" },
                            { id: "completed", label: qsTr("Concluídos"), color: "#34d399" }
                        ]
                        delegate: Rectangle {
                            required property var modelData
                            Layout.fillWidth: true
                            height: 26
                            radius: 6
                            color: feedContainer.activeStatusFilter === modelData.id ? "#262438" : "#0a11101a"
                            border.color: feedContainer.activeStatusFilter === modelData.id ? "#4d8b5cf6" : "#18ffffff"
                            Text {
                                anchors.centerIn: parent
                                text: modelData.label
                                color: feedContainer.activeStatusFilter === modelData.id ? modelData.color : "#94a1b2"
                                font.pixelSize: 10
                                font.bold: feedContainer.activeStatusFilter === modelData.id
                            }
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: feedContainer.statusFilterSelected(modelData.id)
                            }
                        }
                    }
                }

                // Filter Buttons (Tudo | Apenas Tarefas)
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    Rectangle {
                        Layout.fillWidth: true
                        height: 28
                        radius: 6
                        color: feedContainer.taskFilter === "all" ? "#262438" : "transparent"
                        border.color: feedContainer.taskFilter === "all" ? "#4d8b5cf6" : "#2e2b44"
                        border.width: 1

                        Text {
                            anchors.centerIn: parent
                            text: qsTr("Tudo")
                            color: feedContainer.taskFilter === "all" ? "#fffffe" : "#a7a9be"
                            font.pixelSize: 11
                            font.bold: true
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: feedContainer.taskFilter = "all"
                        }
                    }

                    Rectangle {
                        Layout.fillWidth: true
                        height: 28
                        radius: 6
                        color: feedContainer.taskFilter === "tasks" ? "#262438" : "transparent"
                        border.color: feedContainer.taskFilter === "tasks" ? "#4d8b5cf6" : "#2e2b44"
                        border.width: 1

                        Text {
                            anchors.centerIn: parent
                            text: qsTr("Apenas Tarefas")
                            color: feedContainer.taskFilter === "tasks" ? "#fffffe" : "#a7a9be"
                            font.pixelSize: 11
                            font.bold: true
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: feedContainer.taskFilter = "tasks"
                        }
                    }
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            height: 1
            color: "#2e2b44"
        }

        // Scrollable Lists Area
        ScrollView {
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true

            ColumnLayout {
                width: parent.width
                spacing: 18

                // Section 1: Hoje
                ColumnLayout {
                    Layout.fillWidth: true
                    Layout.leftMargin: 14
                    Layout.rightMargin: 14
                    Layout.topMargin: 10
                    spacing: 8

                    Text {
                        text: qsTr("HOJE") + (feedContainer.todayList.length > 0 ? (" (" + feedContainer.todayList.length + ")") : "")
                        color: "#94a1b2"
                        font.pixelSize: 11
                        font.bold: true
                    }

                    Text {
                        visible: feedContainer.todayList.length === 0
                        text: qsTr("Nada para hoje.")
                        color: "#64748b"
                        font.pixelSize: 12
                        font.italic: true
                    }

                    Repeater {
                        model: feedContainer.todayList
                        delegate: Rectangle {
                            id: todayItemRect
                            property var itemData: modelData
                            Layout.fillWidth: true
                            height: 48
                            radius: 8
                            color: todayItemMouse.containsMouse ? "#201e33" : "#1a1928"
                            border.color: "#2e2b44"
                            border.width: 1

                            RowLayout {
                                anchors.fill: parent
                                anchors.leftMargin: 10
                                anchors.rightMargin: 10
                                spacing: 8

                                // Checkbox for tasks, color dot for events
                                Rectangle {
                                    width: 18; height: 18; radius: feedContainer.isTaskEvent(todayItemRect.itemData) ? 4 : 9
                                    color: todayItemRect.itemData.status === "completed" ? "#10b981" : "transparent"
                                    border.color: todayItemRect.itemData.color || (todayItemRect.itemData.status === "completed" ? "#10b981" : "#4f46e5")
                                    border.width: 1.5

                                    Text {
                                        anchors.centerIn: parent
                                        visible: todayItemRect.itemData.status === "completed"
                                        text: "✓"
                                        color: "#ffffff"
                                        font.pixelSize: 11
                                        font.bold: true
                                    }

                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            feedContainer.toggleStatusRequested(todayItemRect.itemData.id, todayItemRect.itemData.status)
                                        }
                                    }
                                }

                                ColumnLayout {
                                    Layout.fillWidth: true
                                    spacing: 1

                                    Text {
                                        Layout.fillWidth: true
                                        text: todayItemRect.itemData.title || ""
                                        color: todayItemRect.itemData.status === "completed" ? "#64748b" : "#fffffe"
                                        font.pixelSize: 12
                                        font.bold: true
                                        font.strikeout: todayItemRect.itemData.status === "completed"
                                        elide: Text.ElideRight
                                    }

                                    Text {
                                        readonly property string timeStr: feedContainer.getEventTimeStr(todayItemRect.itemData.start_date || todayItemRect.itemData.start_time || "")
                                        visible: timeStr.length > 0
                                        text: "🕒 " + timeStr
                                        color: "#94a1b2"
                                        font.pixelSize: 10
                                    }
                                }

                                Text {
                                    text: "✎"
                                    color: "#a7a9be"
                                    font.pixelSize: 12
                                    visible: todayItemMouse.containsMouse
                                }
                            }

                            MouseArea {
                                id: todayItemMouse
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: feedContainer.editRequested(todayItemRect.itemData)
                            }
                        }
                    }
                }

                // Section 2: Próximos Dias
                ColumnLayout {
                    Layout.fillWidth: true
                    Layout.leftMargin: 14
                    Layout.rightMargin: 14
                    Layout.bottomMargin: 14
                    spacing: 8

                    Text {
                        text: qsTr("PRÓXIMOS DIAS") + (feedContainer.upcomingList.length > 0 ? (" (" + feedContainer.upcomingList.length + ")") : "")
                        color: "#94a1b2"
                        font.pixelSize: 11
                        font.bold: true
                    }

                    Text {
                        visible: feedContainer.upcomingList.length === 0
                        text: qsTr("Nenhum evento futuro.")
                        color: "#64748b"
                        font.pixelSize: 12
                        font.italic: true
                    }

                    Repeater {
                        model: feedContainer.upcomingList
                        delegate: Rectangle {
                            id: upItemRect
                            property var itemData: modelData
                            Layout.fillWidth: true
                            height: 48
                            radius: 8
                            color: upItemMouse.containsMouse ? "#201e33" : "#1a1928"
                            border.color: "#2e2b44"
                            border.width: 1

                            RowLayout {
                                anchors.fill: parent
                                anchors.leftMargin: 10
                                anchors.rightMargin: 10
                                spacing: 8

                                Rectangle {
                                    width: 18; height: 18; radius: feedContainer.isTaskEvent(upItemRect.itemData) ? 4 : 9
                                    color: upItemRect.itemData.status === "completed" ? "#10b981" : "transparent"
                                    border.color: upItemRect.itemData.color || (upItemRect.itemData.status === "completed" ? "#10b981" : "#4f46e5")
                                    border.width: 1.5

                                    Text {
                                        anchors.centerIn: parent
                                        visible: upItemRect.itemData.status === "completed"
                                        text: "✓"
                                        color: "#ffffff"
                                        font.pixelSize: 11
                                        font.bold: true
                                    }

                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            feedContainer.toggleStatusRequested(upItemRect.itemData.id, upItemRect.itemData.status)
                                        }
                                    }
                                }

                                ColumnLayout {
                                    Layout.fillWidth: true
                                    spacing: 1

                                    Text {
                                        Layout.fillWidth: true
                                        text: upItemRect.itemData.title || ""
                                        color: upItemRect.itemData.status === "completed" ? "#64748b" : "#fffffe"
                                        font.pixelSize: 12
                                        font.bold: true
                                        font.strikeout: upItemRect.itemData.status === "completed"
                                        elide: Text.ElideRight
                                    }

                                    Text {
                                        readonly property string dStr: feedContainer.getEventDayStr(upItemRect.itemData.start_date || upItemRect.itemData.start_time || "")
                                        readonly property string tStr: feedContainer.getEventTimeStr(upItemRect.itemData.start_date || upItemRect.itemData.start_time || "")
                                        text: dStr + (tStr.length > 0 ? (" • " + tStr) : "")
                                        color: "#94a1b2"
                                        font.pixelSize: 10
                                    }
                                }

                                Text {
                                    text: "✎"
                                    color: "#a7a9be"
                                    font.pixelSize: 12
                                    visible: upItemMouse.containsMouse
                                }
                            }

                            MouseArea {
                                id: upItemMouse
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: feedContainer.editRequested(upItemRect.itemData)
                            }
                        }
                    }
                }
            }
        }
    }
}
