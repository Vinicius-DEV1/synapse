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
    readonly property var attrs: eventState.attrs
    readonly property string eventId: eventState.eventId
    readonly property string title: eventState.title
    readonly property string dateStr: eventState.dateStr
    readonly property string eventColor: eventState.eventColor
    readonly property string status: eventState.status
    readonly property string statusErrorMessage: eventState.statusErrorMessage
    readonly property var eventRecord: eventState.eventRecord
    readonly property bool isCompleted: eventState.isCompleted
    readonly property bool isMissingEvent: eventState.isMissingEvent
    readonly property bool hasLinkedEvent: eventState.hasLinkedEvent
    readonly property bool isLive: eventState.isLive
    readonly property bool hasCustomColor: eventState.hasCustomColor
    property bool isPopoverOpen: false
    property bool removalConfirmed: false
    property real livePulseOpacity: 1.0
    readonly property real livePulseMinimumOpacity: 0.72
    readonly property int livePulsePhaseDurationMs: 800

    color: isMissingEvent
        ? (hoverHandler.hovered ? "#33ef4444" : "#1aef4444")
        : (isCompleted
            ? "#1a10b981"
            : (isLive
                ? (hoverHandler.hovered ? "#33f59e0b" : "#1af59e0b")
                : (hasCustomColor
                    ? (eventColor + "18")
                    : (hoverHandler.hovered ? "#338b5cf6" : "#1a8b5cf6"))))
    border.color: isMissingEvent
        ? (hoverHandler.hovered || isPopoverOpen ? "#ef4444" : "#66ef4444")
        : (isCompleted
            ? "#4d10b981"
            : (isLive
                ? (hoverHandler.hovered || isPopoverOpen ? "#f59e0b" : "#66f59e0b")
                : (hasCustomColor
                    ? (hoverHandler.hovered || isPopoverOpen ? eventColor : (eventColor + "60"))
                    : (hoverHandler.hovered || isPopoverOpen ? "#808b5cf6" : "#4d8b5cf6"))))
    border.width: 1
    opacity: isCompleted ? 0.82 : (isLive ? livePulseOpacity : 1.0)
    Behavior on color { ColorAnimation { duration: 150 } }
    Behavior on border.color { ColorAnimation { duration: 150 } }

    SequentialAnimation on livePulseOpacity {
        running: eventWidgetRoot.isLive
        loops: Animation.Infinite
        NumberAnimation { to: eventWidgetRoot.livePulseMinimumOpacity; duration: eventWidgetRoot.livePulsePhaseDurationMs }
        NumberAnimation { to: 1.0; duration: eventWidgetRoot.livePulsePhaseDurationMs }
    }

    signal attrsUpdated(var newAttrs)
    signal removeRequested()
    signal moveUpRequested()
    signal moveDownRequested()
    signal openCalendarRequested()

    HoverHandler { id: hoverHandler }

    CalendarEventWidgetState {
        id: eventState
        controller: eventWidgetRoot.controller
        blockData: eventWidgetRoot.blockData
        onAttrsUpdated: function(newAttrs) { eventWidgetRoot.attrsUpdated(newAttrs) }
        onRemoveRequested: {
            eventWidgetRoot.removalConfirmed = true
            eventWidgetRoot.removeRequested()
        }
    }

    Timer {
        interval: Math.max(1, Math.min(eventState.maxLiveTimerIntervalMs,
            eventState.nextLiveTransitionTimestamp - eventState.currentTimestamp))
        repeat: false
        running: eventState.nextLiveTransitionTimestamp > eventState.currentTimestamp
        onTriggered: eventState.currentTimestamp = Date.now()
    }

    function formatDateDisplay(raw) {
        if (!raw || raw.length === 0) return ""
        var clean = String(raw).trim()
        var match = clean.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}:\d{2}))?/)
        if (match) return match[3] + "/" + match[2] + (match[4] ? (", " + match[4]) : "")
        return clean.substring(0, 16)
    }

    function requestDeleteConfirmation() {
        eventState.requestDeleteConfirmation(eventDeleteConfirmation)
    }

    ToolTip.visible: statusErrorMessage.length > 0
    ToolTip.text: statusErrorMessage
    ToolTip.timeout: 5000

    MouseArea {
        anchors.fill: parent
        cursorShape: Qt.PointingHandCursor
        onClicked: {
            if (eventWidgetRoot.isMissingEvent) eventWidgetRoot.requestDeleteConfirmation()
            else eventWidgetRoot.isPopoverOpen = !eventWidgetRoot.isPopoverOpen
        }
    }

    RowLayout {
        id: pillRow
        anchors.verticalCenter: parent.verticalCenter
        anchors.left: parent.left
        anchors.leftMargin: 10
        spacing: 6

        Rectangle {
            visible: !eventWidgetRoot.isMissingEvent
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
                    eventState.toggleStatus()
                }
            }
        }

        AppIcon {
            Layout.preferredWidth: 13
            Layout.preferredHeight: 13
            name: eventWidgetRoot.isMissingEvent ? "alert" : "calendar"
            color: eventWidgetRoot.isCompleted
                ? "#34d399"
                : (eventWidgetRoot.isMissingEvent
                    ? "#f87171"
                    : (eventWidgetRoot.isLive ? "#fcd34d" : (eventWidgetRoot.hasCustomColor ? eventWidgetRoot.eventColor : "#c4b5fd")))
        }

        Text {
            text: eventWidgetRoot.title + (eventWidgetRoot.isMissingEvent ? qsTr(" (Evento Excluído)") : "")
            color: eventWidgetRoot.isCompleted
                ? "#34d399"
                : (eventWidgetRoot.isMissingEvent
                    ? "#f87171"
                    : (eventWidgetRoot.isLive ? "#fcd34d" : (eventWidgetRoot.hasCustomColor ? eventWidgetRoot.eventColor : "#c4b5fd")))
            font.pixelSize: 12
            font.weight: Font.Medium
            font.strikeout: eventWidgetRoot.isCompleted
            elide: Text.ElideRight
            Layout.maximumWidth: 190
        }

        Text {
            visible: eventWidgetRoot.dateStr.length > 0
            text: "• " + eventWidgetRoot.formatDateDisplay(eventWidgetRoot.dateStr)
            color: eventWidgetRoot.isMissingEvent
                ? "#bff87171"
                : (eventWidgetRoot.isCompleted
                    ? "#bf34d399"
                    : (eventWidgetRoot.isLive
                        ? "#bffcd34d"
                        : (eventWidgetRoot.hasCustomColor ? eventWidgetRoot.eventColor : "#bfc4b5fd")))
            font.pixelSize: 10
        }

        ToolButton {
            id: moveUpButton
            visible: hoverHandler.hovered
            Layout.preferredWidth: 18
            Layout.preferredHeight: 18
            focusPolicy: Qt.NoFocus
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Subir bloco")
            onClicked: eventWidgetRoot.moveUpRequested()
            background: Rectangle { radius: 4; color: moveUpButton.hovered ? "#1affffff" : "transparent" }
            contentItem: AppIcon {
                anchors.centerIn: parent
                name: "arrow-up"
                color: moveUpButton.hovered ? "#fffffe" : "#a7a9be"
                width: 11
                height: 11
            }
        }

        ToolButton {
            id: moveDownButton
            visible: hoverHandler.hovered
            Layout.preferredWidth: 18
            Layout.preferredHeight: 18
            focusPolicy: Qt.NoFocus
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Descer bloco")
            onClicked: eventWidgetRoot.moveDownRequested()
            background: Rectangle { radius: 4; color: moveDownButton.hovered ? "#1affffff" : "transparent" }
            contentItem: AppIcon {
                anchors.centerIn: parent
                name: "arrow-down"
                color: moveDownButton.hovered ? "#fffffe" : "#a7a9be"
                width: 11
                height: 11
            }
        }

        ToolButton {
            id: removeWidgetButton
            visible: hoverHandler.hovered
            Layout.preferredWidth: 20
            Layout.preferredHeight: 20
            focusPolicy: Qt.NoFocus
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Remover widget")
            onClicked: eventWidgetRoot.requestDeleteConfirmation()
            background: Rectangle { radius: 4; color: removeWidgetButton.hovered ? "#22ef4444" : "transparent" }
            contentItem: AppIcon {
                anchors.centerIn: parent
                name: "close"
                color: removeWidgetButton.hovered ? "#f87171" : "#a7a9be"
                width: 10
                height: 10
            }
        }
    }

    CalendarEventWidgetPopover {
        isOpen: eventWidgetRoot.isPopoverOpen
        anchorItem: eventWidgetRoot
        title: eventWidgetRoot.title
        dateStr: eventWidgetRoot.dateStr
        dateDisplay: eventWidgetRoot.formatDateDisplay(eventWidgetRoot.dateStr)
        eventColor: eventWidgetRoot.eventColor
        status: eventWidgetRoot.status
        remindersLabel: eventState.formatRemindersLabel(eventWidgetRoot.eventRecord.reminders)
        onEventColorSelected: function(color) { eventState.setWidgetColor(color) }
        onToggleStatus: eventState.toggleStatus()
        onEditSaved: function(newTitle, newDate) { eventState.saveEventDetails(newTitle, newDate) }
        onDeleteRequested: eventWidgetRoot.requestDeleteConfirmation()
        onOpenCalendarRequested: eventWidgetRoot.openCalendarRequested()
        onCloseRequested: eventWidgetRoot.isPopoverOpen = false
    }

    AppConfirmDialog {
        id: eventDeleteConfirmation
        parent: Overlay.overlay
        anchors.centerIn: parent
    }

}
