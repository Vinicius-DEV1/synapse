import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: eventWidgetRoot
    implicitWidth: Math.min(parent ? parent.width : 560, pillRow.implicitWidth + 20)
    implicitHeight: 30
    radius: 8

    property var blockData: ({})
    property var controller: null
    property var attrs: blockData.attrs || ({})
    property string eventId: attrs["data-event-id"] || attrs["event-id"] || attrs["eventId"] || ""
    property string title: attrs["data-title"] || attrs["title"] || qsTr("Novo Evento")
    property string dateStr: attrs["data-date"] || attrs["data-start-date"] || attrs["dateStr"] || ""
    property string eventColor: attrs["data-color"] || attrs["color"] || "default"
    property string status: attrs["data-status"] || attrs["status"] || "pending"
    property bool isPopoverOpen: false

    readonly property bool isCompleted: status === "completed"
    readonly property bool isExpired: !isCompleted && dateStr.length >= 10 &&
        dateStr.substring(0, 10) < Qt.formatDate(new Date(), "yyyy-MM-dd")
    readonly property bool hasCustomColor: eventColor.length > 0 && eventColor !== "default" && eventColor !== "#8b5cf6"
    readonly property string resolvedAccent: isExpired ? "#fb7185" : (hasCustomColor ? eventColor : "#a78bfa")

    color: isCompleted
        ? "#1a10b981"
        : (isExpired
            ? "#1af43f5e"
            : (hasCustomColor
                ? (eventColor + "18")
                : (hoverHandler.hovered ? "#338b5cf6" : "#1a8b5cf6")))
    border.color: isCompleted
        ? "#4d10b981"
        : (isExpired
            ? "#66f43f5e"
            : (hasCustomColor
                ? (hoverHandler.hovered || isPopoverOpen ? eventColor : (eventColor + "60"))
                : (hoverHandler.hovered || isPopoverOpen ? "#808b5cf6" : "#4d8b5cf6")))
    border.width: 1
    opacity: isCompleted ? 0.82 : 1.0
    Behavior on color { ColorAnimation { duration: 150 } }
    Behavior on border.color { ColorAnimation { duration: 150 } }

    signal attrsUpdated(var newAttrs)
    signal removeRequested()

    HoverHandler { id: hoverHandler }

    function formatDateDisplay(raw) {
        if (!raw || raw.length === 0) return ""
        var clean = String(raw).trim()
        // Convert YYYY-MM-DD or ISO YYYY-MM-DDTHH:mm to DD/MM or DD/MM HH:mm
        var m = clean.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}:\d{2}))?/)
        if (m) {
            return m[3] + "/" + m[2] + (m[4] ? (", " + m[4]) : "")
        }
        return clean.substring(0, 16)
    }

    function syncFromCore() {
        var c = eventWidgetRoot.controller || (typeof dataController !== "undefined" ? dataController : null)
        if (!eventId || !c || typeof c.getCalendarEvents !== "function") return
        var events = c.getCalendarEvents() || []
        for (var i = 0; i < events.length; i++) {
            if (events[i].id === eventId) {
                title = events[i].title || title
                dateStr = String(events[i].start_date || dateStr).substring(0, 16)
                if (events[i].color) eventColor = events[i].color
                status = events[i].status || (events[i].completed ? "completed" : status)
                break
            }
        }
    }

    function toggleStatus() {
        status = isCompleted ? "pending" : "completed"
        var next = Object.assign({}, attrs)
        next["data-status"] = status
        next["data-title"] = title
        next["data-date"] = dateStr
        if (hasCustomColor) next["data-color"] = eventColor
        attrsUpdated(next)
    }

    Component.onCompleted: syncFromCore()
    onBlockDataChanged: syncFromCore()

    MouseArea {
        anchors.fill: parent
        cursorShape: Qt.PointingHandCursor
        onClicked: eventWidgetRoot.isPopoverOpen = !eventWidgetRoot.isPopoverOpen
    }

    RowLayout {
        id: pillRow
        anchors.verticalCenter: parent.verticalCenter
        anchors.left: parent.left
        anchors.leftMargin: 10
        spacing: 6

        // 14x14 Checkbox matching CalendarEventWidgetNodeView.tsx
        Rectangle {
            Layout.preferredWidth: 14
            Layout.preferredHeight: 14
            radius: 3.5
            color: eventWidgetRoot.isCompleted ? "#10b981" : "transparent"
            border.color: eventWidgetRoot.isCompleted
                ? "#10b981"
                : (cbHover.hovered ? "#a78bfa" : "#4dffffff")
            border.width: 1

            HoverHandler { id: cbHover }

            AppIcon {
                anchors.centerIn: parent
                visible: eventWidgetRoot.isCompleted
                name: "check"
                color: "#0f0e17"
                strokeWidth: 2.6
                width: 10
                height: 10
            }

            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: function(mouse) {
                    mouse.accepted = true
                    eventWidgetRoot.toggleStatus()
                }
            }
        }

        AppIcon {
            name: "calendar"
            color: eventWidgetRoot.isCompleted
                ? "#34d399"
                : (eventWidgetRoot.hasCustomColor ? eventWidgetRoot.eventColor : "#c4b5fd")
            width: 13
            height: 13
        }

        Text {
            text: eventWidgetRoot.title
            color: eventWidgetRoot.isCompleted
                ? "#34d399"
                : (eventWidgetRoot.hasCustomColor ? eventWidgetRoot.eventColor : "#c4b5fd")
            font.pixelSize: 12
            font.weight: Font.Medium
            font.strikeout: eventWidgetRoot.isCompleted
            elide: Text.ElideRight
            Layout.maximumWidth: 190
        }

        Text {
            visible: eventWidgetRoot.dateStr.length > 0
            text: "• " + eventWidgetRoot.formatDateDisplay(eventWidgetRoot.dateStr)
            color: eventWidgetRoot.isCompleted
                ? "#bf34d399"
                : (eventWidgetRoot.hasCustomColor ? eventWidgetRoot.eventColor : "#bfc4b5fd")
            font.pixelSize: 10
        }

        ToolButton {
            visible: hoverHandler.hovered
            Layout.preferredWidth: 20
            Layout.preferredHeight: 20
            focusPolicy: Qt.NoFocus
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Remover widget")
            onClicked: eventWidgetRoot.removeRequested()
            background: Rectangle { radius: 4; color: parent.hovered ? "#22ef4444" : "transparent" }
            contentItem: AppIcon {
                anchors.centerIn: parent
                name: "close"
                color: parent.hovered ? "#f87171" : "#a7a9be"
                width: 10
                height: 10
            }
        }
    }

    CalendarEventWidgetPopover {
        isOpen: eventWidgetRoot.isPopoverOpen
        title: eventWidgetRoot.title
        dateStr: eventWidgetRoot.dateStr
        eventColor: eventWidgetRoot.hasCustomColor ? eventWidgetRoot.eventColor : "#8b5cf6"
        status: eventWidgetRoot.status
        onToggleStatus: eventWidgetRoot.toggleStatus()
        onEditSaved: function(nt, nd) {
            eventWidgetRoot.title = nt
            eventWidgetRoot.dateStr = nd
            var next = Object.assign({}, eventWidgetRoot.attrs)
            next["data-title"] = nt
            next["data-date"] = nd
            eventWidgetRoot.attrsUpdated(next)
        }
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
