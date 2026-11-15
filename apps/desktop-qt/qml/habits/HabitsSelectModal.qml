import QtQuick 2.15
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Rectangle {
    id: selectModalRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: false
    z: 130

    property var habitsList: []
    property var selectedIds: []
    property string searchQuery: ""

    signal closeRequested()
    signal habitsSelected(var selectedHabitIds)

    Shortcut {
        sequence: "Escape"
        enabled: selectModalRoot.visible
        onActivated: selectModalRoot.closeRequested()
    }

    MouseArea {
        anchors.fill: parent
        onClicked: selectModalRoot.closeRequested()
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 48, 500)
        height: Math.min(parent.height - 48, 440)
        radius: 16
        color: "#161524"
        border.color: "#38354d"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 14

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Text { text: "🎯"; font.pixelSize: 20 }
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2
                    Text { text: "Selecionar Hábitos"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }
                    Text { text: "Escolha hábitos para monitorar ou vincular"; color: "#94a1b2"; font.pixelSize: 11 }
                }

                Button {
                    text: "✕"
                    flat: true
                    onClicked: selectModalRoot.closeRequested()
                }
            }

            // Search input
            TextField {
                id: sInput
                Layout.fillWidth: true
                placeholderText: "Buscar hábito..."
                color: "#fffffe"
                background: Rectangle {
                    color: "#1f1d2e"
                    radius: 8
                    border.color: "#2e2b44"
                }
                onTextChanged: selectModalRoot.searchQuery = sInput.text.trim().toLowerCase()
            }

            // Habits list
            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                radius: 8
                color: "#11101a"
                border.color: "#2e2b44"

                ListView {
                    id: hListView
                    anchors.fill: parent
                    anchors.margins: 8
                    clip: true
                    model: selectModalRoot.habitsList.filter(function(h) {
                        if (!selectModalRoot.searchQuery) return true
                        return (h.title || "").toLowerCase().indexOf(selectModalRoot.searchQuery) !== -1
                    })
                    spacing: 6

                    delegate: Rectangle {
                        width: hListView.width
                        height: 42
                        radius: 6
                        property bool isChecked: selectModalRoot.selectedIds.indexOf(modelData.id) !== -1
                        color: isChecked ? "#268b5cf6" : (hMouse.containsMouse ? "#1f1d2e" : "transparent")

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 8
                            spacing: 10

                            CheckBox {
                                checked: parent.parent.isChecked
                                onClicked: toggleSelection(modelData.id)
                            }

                            Text { text: modelData.icon || "⭐"; font.pixelSize: 14 }
                            Text {
                                text: modelData.title || ""
                                color: "#fffffe"
                                font.pixelSize: 13
                                elide: Text.ElideRight
                                Layout.fillWidth: true
                            }
                        }

                        MouseArea {
                            id: hMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: toggleSelection(modelData.id)
                        }
                    }
                }
            }

            // Actions
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Text {
                    text: selectModalRoot.selectedIds.length + " selecionado(s)"
                    color: "#94a1b2"
                    font.pixelSize: 12
                    Layout.fillWidth: true
                }

                Button {
                    text: "Cancelar"
                    background: Rectangle { color: "#232135"; radius: 8 }
                    contentItem: Text { text: parent.text; color: "#fffffe"; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: selectModalRoot.closeRequested()
                }

                Button {
                    text: "Confirmar Seleção"
                    background: Rectangle { color: "#8b5cf6"; radius: 8 }
                    contentItem: Text { text: parent.text; color: "#ffffff"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                    onClicked: {
                        selectModalRoot.habitsSelected(selectModalRoot.selectedIds)
                        selectModalRoot.closeRequested()
                    }
                }
            }
        }
    }

    function toggleSelection(habitId) {
        var arr = [...selectedIds]
        var idx = arr.indexOf(habitId)
        if (idx !== -1) {
            arr.splice(idx, 1)
        } else {
            arr.push(habitId)
        }
        selectedIds = arr
    }
}
