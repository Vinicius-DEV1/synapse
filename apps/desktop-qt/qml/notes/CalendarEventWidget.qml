import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: eventWidgetRoot
    Layout.fillWidth: true
    implicitHeight: 54
    radius: 10
    color: "#16161e"
    border.color: hoverHandler.hovered ? "#7c3aed" : "#2e2e38"
    border.width: 1

    property var blockData: ({})
    property var attrs: blockData.attrs || ({})
    property string eventId: attrs["data-event-id"] || attrs["event-id"] || ""
    property string title: attrs["data-title"] || attrs["title"] || qsTr("Evento da Agenda")
    property string dateStr: attrs["data-date"] || attrs["data-start-date"] || ""
    property string eventColor: attrs["data-color"] || attrs["color"] || "#3b82f6"
    property string status: attrs["data-status"] || attrs["status"] || "pending"
    property bool isPopoverOpen: false

    signal attrsUpdated(var newAttrs)
    signal removeRequested()

    HoverHandler { id: hoverHandler }

    function syncFromCore() {
        if (!eventId || typeof dataController === "undefined" || !dataController || typeof dataController.getCalendarEvents !== "function") return
        var events = dataController.getCalendarEvents() || []
        for (var i = 0; i < events.length; i++) {
            if (events[i].id === eventId) {
                title = events[i].title || title
                dateStr = String(events[i].start_date || dateStr).substring(0, 16)
                eventColor = events[i].color || eventColor
                status = events[i].status || (events[i].completed ? "completed" : status)
                break
            }
        }
    }

    function toggleStatus() {
        status = status === "completed" ? "pending" : "completed"
        var next = Object.assign({}, attrs)
        next["data-status"] = status
        next["data-title"] = title
        next["data-date"] = dateStr
        next["data-color"] = eventColor
        attrsUpdated(next)
    }

    Component.onCompleted: syncFromCore()
    onBlockDataChanged: syncFromCore()

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 10
        anchors.rightMargin: 10
        spacing: 10

        Rectangle {
            Layout.preferredWidth: 4
            Layout.preferredHeight: 32
            radius: 2
            color: eventWidgetRoot.eventColor
        }

        Rectangle {
            Layout.preferredWidth: 20
            Layout.preferredHeight: 20
            radius: 5
            color: eventWidgetRoot.status === "completed" ? "#10b981" : "#1f1f2e"
            border.color: eventWidgetRoot.status === "completed" ? "#10b981" : "#4b5563"

            AppIcon {
                anchors.centerIn: parent
                visible: eventWidgetRoot.status === "completed"
                name: "check"
                color: "#ffffff"
                width: 12
                height: 12
            }

            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: eventWidgetRoot.toggleStatus()
            }
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: 2
            Text {
                text: eventWidgetRoot.title
                color: eventWidgetRoot.status === "completed" ? "#9ca3af" : "#fffffe"
                font.pixelSize: 13
                font.weight: Font.DemiBold
                font.strikeout: eventWidgetRoot.status === "completed"
                elide: Text.ElideRight
                Layout.fillWidth: true
            }
            Text {
                visible: eventWidgetRoot.dateStr.length > 0
                text: eventWidgetRoot.dateStr
                color: "#a7a9be"
                font.pixelSize: 11
            }
        }

        ToolButton {
            Layout.preferredWidth: 28
            Layout.preferredHeight: 28
            focusPolicy: Qt.NoFocus
            onClicked: eventWidgetRoot.isPopoverOpen = true
            background: Rectangle { radius: 6; color: parent.hovered ? "#2e2e38" : "transparent" }
            contentItem: AppIcon { anchors.centerIn: parent; name: "calendar"; color: "#a7a9be"; width: 14; height: 14 }
        }

        ToolButton {
            visible: hoverHandler.hovered
            Layout.preferredWidth: 28
            Layout.preferredHeight: 28
            focusPolicy: Qt.NoFocus
            onClicked: eventWidgetRoot.removeRequested()
            background: Rectangle { radius: 6; color: parent.hovered ? "#22ef4444" : "transparent" }
            contentItem: AppIcon { anchors.centerIn: parent; name: "trash"; color: "#fda4af"; width: 13; height: 13 }
        }
    }

    CalendarEventWidgetPopover {
        isOpen: eventWidgetRoot.isPopoverOpen
        title: eventWidgetRoot.title
        dateStr: eventWidgetRoot.dateStr
        eventColor: eventWidgetRoot.eventColor
        status: eventWidgetRoot.status
        onToggleStatus: eventWidgetRoot.toggleStatus()
        onDeleteRequested: {
            if (eventWidgetRoot.eventId && typeof dataController !== "undefined" && dataController) {
                dataController.deleteCalendarEvent(eventWidgetRoot.eventId)
            }
            eventWidgetRoot.isPopoverOpen = false
            eventWidgetRoot.removeRequested()
        }
        onClosed: eventWidgetRoot.isPopoverOpen = false
    }
}
