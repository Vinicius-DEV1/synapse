import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Item {
    id: popoverRoot
    anchors.fill: parent
    visible: isOpen
    z: 100

    property bool isOpen: false
    property string title: ""
    property string dateStr: ""
    property string eventColor: "#3b82f6"
    property string status: "pending"
    property bool isEditing: false

    signal toggleStatus()
    signal editSaved(string newTitle, string newDate)
    signal deleteRequested()
    signal closed()

    Rectangle {
        anchors.fill: parent
        color: "#b0000000"
        MouseArea {
            anchors.fill: parent
            onClicked: popoverRoot.closed()
        }
    }

    Rectangle {
        width: 340
        height: cardCol.implicitHeight + 40
        anchors.centerIn: parent
        radius: 16
        color: "#16161e"
        border.color: "#2e2e38"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            id: cardCol
            anchors.fill: parent
            anchors.margins: 20
            spacing: 14

            RowLayout {
                spacing: 10
                Rectangle {
                    Layout.preferredWidth: 32
                    Layout.preferredHeight: 32
                    radius: 8
                    color: popoverRoot.eventColor + "25"

                    AppIcon {
                        anchors.centerIn: parent
                        name: "calendar"
                        color: popoverRoot.eventColor
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
                        text: popoverRoot.dateStr || "Data não definida"
                        color: "#a7a9be"
                        font.pixelSize: 11
                    }
                }

                ToolButton {
                    Layout.preferredWidth: 26
                    Layout.preferredHeight: 26
                    onClicked: {
                        editTitleInput.text = popoverRoot.title
                        editDateInput.text = popoverRoot.dateStr
                        popoverRoot.isEditing = !popoverRoot.isEditing
                    }
                    background: Rectangle { radius: 6; color: parent.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "edit"; color: "#a7a9be"; width: 13; height: 13 }
                }
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
                            popoverRoot.closed()
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
                            popoverRoot.closed()
                        }
                    }
                }
            }
        }
    }
}
