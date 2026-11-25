import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Popup {
    id: popoverRoot
    parent: Overlay.overlay
    width: 340
    height: cardCol.implicitHeight + 40
    padding: 20
    modal: false
    focus: true
    closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
    background: Rectangle {
        radius: 12
        color: "#16161e"
        border.color: "#2e2e38"
        border.width: 1
    }

    property bool isOpen: false
    property Item anchorItem: null
    property string title: ""
    property string dateStr: ""
    property string dateDisplay: ""
    property string eventColor: "default"
    readonly property string resolvedColor: eventColor === "default" ? "#8b5cf6" : eventColor
    property string status: "pending"
    property var remindersLabel: ""
    property bool isEditing: false

    signal toggleStatus()
    signal editSaved(string newTitle, string newDate)
    signal eventColorSelected(string color)
    signal deleteRequested()
    signal openCalendarRequested()
    signal closeRequested()

    function updatePosition() {
        if (!anchorItem || !parent) return
        var point = anchorItem.mapToItem(parent, 0, 0)
        var minimum = 8
        var maximumX = Math.max(minimum, parent.width - width - minimum)
        x = Math.max(minimum, Math.min(point.x, maximumX))
        var below = point.y + anchorItem.height + 6
        var above = point.y - height - 6
        y = below + height <= parent.height - minimum ? below : Math.max(minimum, above)
    }

    onIsOpenChanged: {
        if (isOpen) {
            updatePosition()
            open()
        } else {
            close()
        }
    }
    onOpened: updatePosition()
    onClosed: closeRequested()

    Timer {
        interval: 120
        repeat: true
        running: popoverRoot.opened
        onTriggered: popoverRoot.updatePosition()
    }

    contentItem: ColumnLayout {
        id: cardCol
        spacing: 14

        RowLayout {
                spacing: 10
                Rectangle {
                    Layout.preferredWidth: 32
                    Layout.preferredHeight: 32
                    radius: 8
                    color: popoverRoot.resolvedColor + "25"

                    AppIcon {
                        anchors.centerIn: parent
                        name: "calendar"
                        color: popoverRoot.resolvedColor
                        Layout.preferredWidth: 16
                        Layout.preferredHeight: 16
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Text {
                        text: popoverRoot.title || "Evento"
                        color: "#fffffe"
                        font.pixelSize: 14
                        font.weight: Font.Bold
                        elide: Text.ElideRight
                        Layout.fillWidth: true
                    }
                    Text {
                        text: popoverRoot.dateDisplay || popoverRoot.dateStr || qsTr("Data não definida")
                        color: "#a7a9be"
                        font.pixelSize: 11
                    }
                }

                ToolButton {
                    id: editEventButton
                    Layout.preferredWidth: 26
                    Layout.preferredHeight: 26
                    onClicked: {
                        editTitleInput.text = popoverRoot.title
                        editDateInput.text = popoverRoot.dateStr
                        popoverRoot.isEditing = !popoverRoot.isEditing
                    }
                    background: Rectangle { radius: 6; color: editEventButton.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "edit"; color: "#a7a9be"; width: 13; height: 13 }
                }
            }

            RowLayout {
                visible: popoverRoot.remindersLabel.length > 0
                Layout.fillWidth: true
                spacing: 6
                AppIcon {
                    name: "bell"
                    color: "#c4b5fd"
                    Layout.preferredWidth: 12
                    Layout.preferredHeight: 12
                }
                Text {
                    Layout.fillWidth: true
                    text: qsTr("Avisos: %1").arg(popoverRoot.remindersLabel)
                    color: "#c4b5fd"
                    font.pixelSize: 10
                    wrapMode: Text.WordWrap
                }
            }

            NotesCalendarWidgetColorPicker {
                Layout.fillWidth: true
                selectedColor: popoverRoot.eventColor
                onColorSelected: function(color) { popoverRoot.eventColorSelected(color) }
            }

            ColumnLayout {
                visible: popoverRoot.isEditing
                Layout.fillWidth: true
                spacing: 6
                TextField {
                    id: editTitleInput
                    Layout.fillWidth: true
                    Layout.preferredHeight: 30
                    color: "#fffffe"
                    font.pixelSize: 12
                    background: Rectangle { radius: 6; color: "#0f0e17"; border.color: "#2e2e38" }
                }
                TextField {
                    id: editDateInput
                    Layout.fillWidth: true
                    Layout.preferredHeight: 30
                    placeholderText: "YYYY-MM-DD"
                    color: "#fffffe"
                    font.pixelSize: 12
                    background: Rectangle { radius: 6; color: "#0f0e17"; border.color: "#2e2e38" }
                }
                Button {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 30
                    onClicked: {
                        popoverRoot.isEditing = false
                        popoverRoot.editSaved(editTitleInput.text.trim() || popoverRoot.title, editDateInput.text.trim() || popoverRoot.dateStr)
                    }
                    background: Rectangle { radius: 6; color: "#7c3aed" }
                    contentItem: Text { text: qsTr("Salvar alterações"); color: "#fff"; font.pixelSize: 11; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                }
            }

            // Actions Row
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Rectangle {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 32
                    radius: 6
                    color: openCalendarMouse.containsMouse ? "#2e2e38" : "#1f1f2e"
                    border.color: "#3a3a4c"
                    border.width: 1

                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 6
                        AppIcon {
                            name: "external-link"
                            color: "#fffffe"
                            Layout.preferredWidth: 12
                            Layout.preferredHeight: 12
                        }
                        Text {
                            text: qsTr("Abrir na Agenda")
                            color: "#fffffe"
                            font.pixelSize: 11
                        }
                    }

                    MouseArea {
                        id: openCalendarMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            popoverRoot.openCalendarRequested()
                            popoverRoot.close()
                        }
                    }
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Rectangle {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 32
                    radius: 6
                    color: statusMouse.containsMouse ? "#2e2e38" : "#1f1f2e"
                    border.color: "#3a3a4c"
                    border.width: 1

                    Text {
                        anchors.centerIn: parent
                        text: popoverRoot.status === "completed" ? "✓ Concluído" : "Marcar Concluído"
                        color: popoverRoot.status === "completed" ? "#4ade80" : "#fffffe"
                        font.pixelSize: 11
                    }

                    MouseArea {
                        id: statusMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            popoverRoot.toggleStatus()
                            popoverRoot.close()
                        }
                    }
                }

                Rectangle {
                    Layout.preferredWidth: 32
                    Layout.preferredHeight: 32
                    radius: 6
                    color: delMouse.containsMouse ? "#3b1e28" : "#2a151b"
                    border.color: "#ef4444"
                    border.width: 1

                    AppIcon {
                        anchors.centerIn: parent
                        name: "trash"
                        color: "#ef4444"
                        Layout.preferredWidth: 14
                        Layout.preferredHeight: 14
                    }

                    MouseArea {
                        id: delMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            popoverRoot.deleteRequested()
                            popoverRoot.close()
                        }
                    }
                }
            }
    }
}
