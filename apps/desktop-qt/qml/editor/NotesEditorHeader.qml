import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: headerRoot
    Layout.fillWidth: true
    spacing: 12

    property string activeIcon: "📄"
    property bool isDirty: false
    property bool isPreviewMode: false
    property bool isEmojiPickerOpen: false

    signal saveRequested()
    signal deleteRequested()
    signal iconModified(string newIcon)
    signal previewToggled(bool preview)

    // Top Actions Row: Page Icon + Mode Toggle + Save button + Delete button
    RowLayout {
        Layout.fillWidth: true
        spacing: 12

        // Emoji Icon Button
        Rectangle {
            id: emojiBtn
            width: 44; height: 44; radius: 10
            color: headerRoot.isEmojiPickerOpen ? "#6366f126" : (emojiMouse.containsMouse ? "#211f30" : "#1a1924")
            border.color: headerRoot.isEmojiPickerOpen ? "#818cf8" : "#ffffff12"
            border.width: 1

            Text {
                anchors.centerIn: parent
                text: headerRoot.activeIcon
                font.pixelSize: 24
            }

            MouseArea {
                id: emojiMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: headerRoot.isEmojiPickerOpen = !headerRoot.isEmojiPickerOpen
            }
        }

        // Mode Toggle (Editar / Leitura Zen)
        Rectangle {
            width: 154; height: 36; radius: 8
            color: "#161524"
            border.color: "#ffffff12"

            RowLayout {
                anchors.fill: parent
                anchors.margins: 3
                spacing: 2

                Rectangle {
                    Layout.fillWidth: true; Layout.fillHeight: true
                    radius: 6
                    color: !headerRoot.isPreviewMode ? "#6366f1" : "transparent"
                    Text {
                        anchors.centerIn: parent
                        text: "✏️ Editar"
                        color: !headerRoot.isPreviewMode ? "#ffffff" : "#a7a9be"
                        font.pixelSize: 11
                        font.bold: !headerRoot.isPreviewMode
                    }
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: headerRoot.previewToggled(false)
                    }
                }

                Rectangle {
                    Layout.fillWidth: true; Layout.fillHeight: true
                    radius: 6
                    color: headerRoot.isPreviewMode ? "#6366f1" : "transparent"
                    Text {
                        anchors.centerIn: parent
                        text: "👁️ Leitura"
                        color: headerRoot.isPreviewMode ? "#ffffff" : "#a7a9be"
                        font.pixelSize: 11
                        font.bold: headerRoot.isPreviewMode
                    }
                    MouseArea {
                        anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                        onClicked: headerRoot.previewToggled(true)
                    }
                }
            }
        }

        Item { Layout.fillWidth: true }

        // Save Status / Save Button
        Rectangle {
            width: 130; height: 36; radius: 8
            color: headerRoot.isDirty ? "#6366f1" : "#10b98118"
            border.color: headerRoot.isDirty ? "#4f46e5" : "#10b98133"

            RowLayout {
                anchors.centerIn: parent
                spacing: 6
                Text {
                    text: headerRoot.isDirty ? "💾" : "✓"
                    color: headerRoot.isDirty ? "#ffffff" : "#34d399"
                    font.pixelSize: 12
                    font.bold: true
                }
                Text {
                    text: headerRoot.isDirty ? "Salvar Nota" : "Salvo"
                    color: headerRoot.isDirty ? "#ffffff" : "#34d399"
                    font.pixelSize: 12
                    font.bold: true
                }
            }

            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: headerRoot.saveRequested()
            }
        }

        // Delete Button
        Rectangle {
            width: 36; height: 36; radius: 8
            color: "#f43f5e18"
            border.color: "#f43f5e33"

            Text {
                anchors.centerIn: parent
                text: "🗑️"
                font.pixelSize: 13
            }

            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: headerRoot.deleteRequested()
            }
        }
    }

    // Emoji Picker Grid Popover
    Rectangle {
        visible: headerRoot.isEmojiPickerOpen
        Layout.fillWidth: true
        height: 84
        radius: 12
        color: "#161524"
        border.color: "#818cf84d"
        border.width: 1

        RowLayout {
            anchors.fill: parent
            anchors.margins: 12
            spacing: 8

            Repeater {
                model: ["📄", "💡", "🚀", "📚", "💻", "🎨", "⚡", "🎯", "🔒", "⭐", "🧠", "🔥", "📊", "💰", "🎵", "📝"]
                delegate: Rectangle {
                    Layout.fillWidth: true
                    height: 36
                    radius: 8
                    color: emMouse.containsMouse ? "#ffffff18" : "#1a1924"
                    border.color: "#ffffff0a"
                    Text { anchors.centerIn: parent; text: modelData; font.pixelSize: 18 }
                    MouseArea {
                        id: emMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            headerRoot.iconModified(modelData)
                            headerRoot.isEmojiPickerOpen = false
                        }
                    }
                }
            }
        }
    }
}
