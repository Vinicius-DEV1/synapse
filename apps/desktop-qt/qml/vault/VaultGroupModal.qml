pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Item {
    id: groupModalRoot
    anchors.fill: parent
    visible: isOpen
    z: 99

    property bool isOpen: false
    property var group: null
    property string groupName: ""
    property string groupColor: "#3b82f6"
    property var palette: ["#3b82f6", "#10b981", "#8b5cf6", "#f43f5e", "#f59e0b", "#06b6d4", "#6366f1", "#ec4899", "#14b8a6", "#71717a"]

    signal saved()
    signal closed()

    onIsOpenChanged: {
        if (isOpen) {
            groupName = group ? (group.name || "") : ""
            groupColor = group ? (group.color || "#3b82f6") : "#3b82f6"
            nameInput.forceActiveFocus()
        }
    }

    // Backdrop
    Rectangle {
        anchors.fill: parent
        color: "#b0000000"
        MouseArea {
            anchors.fill: parent
            onClicked: groupModalRoot.closed()
        }
    }

    // Modal Card
    Rectangle {
        width: 420
        height: cardCol.implicitHeight + 48
        anchors.centerIn: parent
        radius: 20
        color: "#16161e"
        border.color: "#2e2e38"
        border.width: 1

        MouseArea {
            anchors.fill: parent
            // Prevent clicks from reaching backdrop
        }

        ColumnLayout {
            id: cardCol
            anchors.fill: parent
            anchors.margins: 24
            spacing: 20

            // Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Rectangle {
                    Layout.preferredWidth: 40
                    Layout.preferredHeight: 40
                    radius: 10
                    color: groupModalRoot.groupColor + "25"

                    AppIcon {
                        anchors.centerIn: parent
                        name: "folder"
                        color: groupModalRoot.groupColor
                        Layout.preferredWidth: 20
                        Layout.preferredHeight: 20
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2

                    Text {
                        text: groupModalRoot.group ? "Editar Grupo" : "Novo Grupo"
                        color: "#fffffe"
                        font.pixelSize: 16
                        font.weight: Font.Bold
                    }

                    Text {
                        text: groupModalRoot.group ? "Altere o nome e a cor do grupo" : "Organize seus itens com um grupo personalizado"
                        color: "#a7a9be"
                        font.pixelSize: 12
                    }
                }

                Rectangle {
                    Layout.preferredWidth: 28
                    Layout.preferredHeight: 28
                    radius: 6
                    color: closeMouse.containsMouse ? "#2e2e38" : "transparent"

                    AppIcon {
                        anchors.centerIn: parent
                        name: "close"
                        color: "#9ca3af"
                        Layout.preferredWidth: 14
                        Layout.preferredHeight: 14
                    }

                    MouseArea {
                        id: closeMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: groupModalRoot.closed()
                    }
                }
            }

            // Name Field
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 6

                Text {
                    text: "NOME DO GRUPO"
                    color: "#a7a9be"
                    font.pixelSize: 11
                    font.weight: Font.DemiBold
                }

                TextField {
                    id: nameInput
                    Layout.fillWidth: true
                    Layout.preferredHeight: 40
                    text: groupModalRoot.groupName
                    placeholderText: "Ex: Trabalho, Finanças, Pessoal..."
                    color: "#fffffe"
                    placeholderTextColor: "#4b5563"
                    font.pixelSize: 13
                    background: Rectangle {
                        radius: 10
                        color: "#0f0e17"
                        border.color: nameInput.activeFocus ? "#7c3aed" : "#2e2e38"
                        border.width: 1
                    }
                    onTextChanged: groupModalRoot.groupName = text
                }
            }

            // Color Palette
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 8

                Text {
                    text: "COR DO ÍCONE"
                    color: "#a7a9be"
                    font.pixelSize: 11
                    font.weight: Font.DemiBold
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    Repeater {
                        model: groupModalRoot.palette

                        delegate: Rectangle {
                            id: paletteDelegate
                            required property var modelData
                            required property int index

                            Layout.preferredWidth: 26
                            Layout.preferredHeight: 26
                            radius: 13
                            color: paletteDelegate.modelData
                            border.color: groupModalRoot.groupColor === paletteDelegate.modelData ? "#ffffff" : "transparent"
                            border.width: 2

                            AppIcon {
                                visible: groupModalRoot.groupColor === paletteDelegate.modelData
                                anchors.centerIn: parent
                                name: "check"
                                color: "#ffffff"
                                Layout.preferredWidth: 12
                                Layout.preferredHeight: 12
                            }

                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: groupModalRoot.groupColor = paletteDelegate.modelData
                            }
                        }
                    }
                }
            }

            // Action Buttons
            RowLayout {
                Layout.fillWidth: true
                Layout.topMargin: 8
                spacing: 12

                Item { Layout.fillWidth: true }

                Rectangle {
                    Layout.preferredWidth: 90
                    Layout.preferredHeight: 36
                    radius: 8
                    color: cancelMouse.containsMouse ? "#2e2e38" : "transparent"
                    border.color: "#2e2e38"
                    border.width: 1

                    Text {
                        anchors.centerIn: parent
                        text: "Cancelar"
                        color: "#a7a9be"
                        font.pixelSize: 12
                    }

                    MouseArea {
                        id: cancelMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: groupModalRoot.closed()
                    }
                }

                Rectangle {
                    Layout.preferredWidth: 90
                    Layout.preferredHeight: 36
                    radius: 8
                    color: saveMouse.containsMouse ? "#6d28d9" : "#7c3aed"

                    Text {
                        anchors.centerIn: parent
                        text: "Salvar"
                        color: "#ffffff"
                        font.pixelSize: 12
                        font.weight: Font.DemiBold
                    }

                    MouseArea {
                        id: saveMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            if (groupModalRoot.groupName.trim().length === 0) return
                            if (groupModalRoot.group && groupModalRoot.group.id) {
                                dataController.updateVaultGroup(groupModalRoot.group.id, groupModalRoot.groupName.trim(), "", groupModalRoot.groupColor)
                            } else {
                                dataController.createVaultGroup(groupModalRoot.groupName.trim(), "", groupModalRoot.groupColor)
                            }
                            groupModalRoot.saved()
                            groupModalRoot.closed()
                        }
                    }
                }
            }
        }
    }
}
