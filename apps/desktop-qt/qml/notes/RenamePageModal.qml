import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: renameModal
    anchors.fill: parent
    z: 9995
    visible: false
    color: "#aa000000"

    property string pageId: ""
    property string currentTitle: ""

    signal renamed(string pageId, string newTitle)
    signal closed()

    Theme { id: theme }

    function openFor(id, title) {
        pageId = id
        currentTitle = title || ""
        titleInput.text = currentTitle
        visible = true
        titleInput.forceActiveFocus()
        titleInput.selectAll()
    }

    function submit() {
        var trimmed = titleInput.text.trim()
        if (trimmed.length === 0 || pageId.length === 0) return
        visible = false
        renamed(pageId, trimmed)
    }

    MouseArea {
        anchors.fill: parent
        onClicked: {
            renameModal.visible = false
            renameModal.closed()
        }
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(420, parent.width - 32)
        height: contentCol.implicitHeight + 40
        radius: 14
        color: theme.bgDarkCard
        border.color: theme.borderBrand
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            id: contentCol
            anchors.fill: parent
            anchors.margins: 20
            spacing: 14

            RowLayout {
                Layout.fillWidth: true
                spacing: 8
                AppIcon { Layout.preferredWidth: 18; Layout.preferredHeight: 18; name: "edit"; color: theme.brand400 }
                Text {
                    text: qsTr("Renomear página")
                    color: theme.textDark
                    font.pixelSize: 16
                    font.bold: true
                    Layout.fillWidth: true
                }
                Rectangle {
                    Layout.preferredWidth: 28; Layout.preferredHeight: 28; radius: 6
                    color: closeMouse.containsMouse ? theme.bgHover : "transparent"
                    AppIcon { anchors.centerIn: parent; width: 14; height: 14; name: "close"; color: theme.textSubtext }
                    MouseArea {
                        id: closeMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            renameModal.visible = false
                            renameModal.closed()
                        }
                    }
                }
            }

            TextField {
                id: titleInput
                Layout.fillWidth: true
                placeholderText: qsTr("Título da página")
                color: theme.textDark
                font.pixelSize: 14
                padding: 10
                background: Rectangle {
                    color: theme.bgDarkBg
                    radius: 8
                    border.color: titleInput.activeFocus ? theme.brand500 : theme.borderSubtle
                }
                Keys.onReturnPressed: renameModal.submit()
                Keys.onEnterPressed: renameModal.submit()
                Keys.onEscapePressed: {
                    renameModal.visible = false
                    renameModal.closed()
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 10
                Item { Layout.fillWidth: true }

                Rectangle {
                    Layout.preferredWidth: 90; Layout.preferredHeight: 34; radius: 8
                    color: cancelMouse.containsMouse ? theme.bgHover : "transparent"
                    border.color: theme.borderSubtle
                    Text { anchors.centerIn: parent; text: qsTr("Cancelar"); color: theme.textSubtext; font.pixelSize: 12 }
                    MouseArea {
                        id: cancelMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            renameModal.visible = false
                            renameModal.closed()
                        }
                    }
                }

                Rectangle {
                    Layout.preferredWidth: 100; Layout.preferredHeight: 34; radius: 8
                    color: saveMouse.containsMouse ? theme.brand400 : theme.brand500
                    Text { anchors.centerIn: parent; text: qsTr("Salvar"); color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                    MouseArea {
                        id: saveMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: renameModal.submit()
                    }
                }
            }
        }
    }
}
