import QtQuick 2.15
import QtQuick.Layouts 1.15
import ".."

Rectangle {
    id: eventWidgetRoot
    Layout.fillWidth: true
    Layout.preferredHeight: 48
    radius: 10
    color: "#16161e"
    border.color: cardMouse.containsMouse ? "#7c3aed" : "#2e2e38"
    border.width: 1

    property string eventId: ""
    property string title: "Evento da Agenda"
    property string dateStr: ""
    property string eventColor: "#3b82f6"
    property string status: "pending" // "pending" or "completed"

    signal toggleStatus()
    signal deleteRequested()

    property bool isPopoverOpen: false

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 8
        anchors.rightMargin: 12
        spacing: 10

        // Color indicator bar
        Rectangle {
            Layout.preferredWidth: 4
            Layout.preferredHeight: 32
            radius: 2
            color: eventWidgetRoot.eventColor
        }

        // Checkbox status toggle
        Rectangle {
            Layout.preferredWidth: 20
            Layout.preferredHeight: 20
            radius: 5
            color: eventWidgetRoot.status === "completed" ? "#10b981" : "#1f1f2e"
            border.color: eventWidgetRoot.status === "completed" ? "#10b981" : "#4b5563"
            border.width: 1

            AppIcon {
                anchors.centerIn: parent
                visible: eventWidgetRoot.status === "completed"
                name: "check"
                color: "#ffffff"
                Layout.preferredWidth: 12
                Layout.preferredHeight: 12
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

        // Details Popover Trigger
        Rectangle {
            Layout.preferredWidth: 28
            Layout.preferredHeight: 28
            radius: 6
            color: popoverBtnMouse.containsMouse ? "#2e2e38" : "transparent"

            AppIcon {
                anchors.centerIn: parent
                name: "calendar"
                color: "#a7a9be"
                Layout.preferredWidth: 14
                Layout.preferredHeight: 14
            }

            MouseArea {
                id: popoverBtnMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: eventWidgetRoot.isPopoverOpen = true
            }
        }
    }

    MouseArea {
        id: cardMouse
        anchors.fill: parent
        hoverEnabled: true
        z: -1
        cursorShape: Qt.PointingHandCursor
        onClicked: eventWidgetRoot.isPopoverOpen = true
    }

    CalendarEventWidgetPopover {
        isOpen: eventWidgetRoot.isPopoverOpen
        title: eventWidgetRoot.title
        dateStr: eventWidgetRoot.dateStr
        eventColor: eventWidgetRoot.eventColor
        status: eventWidgetRoot.status
        onClosed: eventWidgetRoot.isPopoverOpen = false
        onToggleStatus: eventWidgetRoot.toggleStatus()
        onDeleteRequested: eventWidgetRoot.deleteRequested()
    }
}
