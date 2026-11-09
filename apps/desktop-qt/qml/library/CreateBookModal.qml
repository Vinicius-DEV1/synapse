import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: createBookRoot
    anchors.fill: parent
    color: "#00000088"
    visible: isOpen
    z: 95

    property bool isOpen: false
    property string selectedColor: "#7c3aed"

    signal closed()
    signal bookCreated(string title, string author, int totalPages, string coverColor)

    onIsOpenChanged: {
        if (isOpen) {
            newBookTitle.text = ""
            newBookAuthor.text = ""
            newBookPages.text = "100"
            selectedColor = "#7c3aed"
            newBookTitle.forceActiveFocus()
        }
    }

    MouseArea {
        anchors.fill: parent
        onClicked: createBookRoot.closed()
    }

    Rectangle {
        anchors.centerIn: parent
        width: 440
        height: 420
        radius: 16
        color: "#161524"
        border.color: "#ffffff14"
        border.width: 1

        MouseArea {
            anchors.fill: parent
        }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 28
            spacing: 16

            RowLayout {
                Layout.fillWidth: true
                Text { text: "📖 Adicionar Novo Livro"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }
                Item { Layout.fillWidth: true }
                Text {
                    text: "✕"
                    color: "#a7a9be"
                    font.pixelSize: 16
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: createBookRoot.closed()
                    }
                }
            }

            // Title Input
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 6
                Text { text: "Título do Livro"; color: "#a7a9be"; font.pixelSize: 12 }
                Rectangle {
                    Layout.fillWidth: true
                    height: 38
                    radius: 8
                    color: "#15141b"
                    border.color: newBookTitle.activeFocus ? "#7c3aed" : "#ffffff15"
                    TextInput {
                        id: newBookTitle
                        anchors.fill: parent
                        anchors.leftMargin: 12; anchors.rightMargin: 12
                        verticalAlignment: TextInput.AlignVCenter
                        color: "#fffffe"
                        font.pixelSize: 13
                        selectByMouse: true
                    }
                }
            }

            // Author Input
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 6
                Text { text: "Autor"; color: "#a7a9be"; font.pixelSize: 12 }
                Rectangle {
                    Layout.fillWidth: true
                    height: 38
                    radius: 8
                    color: "#15141b"
                    border.color: newBookAuthor.activeFocus ? "#7c3aed" : "#ffffff15"
                    TextInput {
                        id: newBookAuthor
                        anchors.fill: parent
                        anchors.leftMargin: 12; anchors.rightMargin: 12
                        verticalAlignment: TextInput.AlignVCenter
                        color: "#fffffe"
                        font.pixelSize: 13
                        selectByMouse: true
                    }
                }
            }

            // Total Pages Input
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 6
                Text { text: "Total de Páginas"; color: "#a7a9be"; font.pixelSize: 12 }
                Rectangle {
                    Layout.fillWidth: true
                    height: 38
                    radius: 8
                    color: "#15141b"
                    border.color: newBookPages.activeFocus ? "#7c3aed" : "#ffffff15"
                    TextInput {
                        id: newBookPages
                        anchors.fill: parent
                        anchors.leftMargin: 12; anchors.rightMargin: 12
                        verticalAlignment: TextInput.AlignVCenter
                        color: "#fffffe"
                        font.pixelSize: 13
                        selectByMouse: true
                        text: "100"
                    }
                }
            }

            // Color Selector
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 6
                Text { text: "Cor da Capa"; color: "#a7a9be"; font.pixelSize: 12 }
                RowLayout {
                    spacing: 10
                    Repeater {
                        model: ["#7c3aed", "#6366f1", "#38bdf8", "#10b981", "#f59e0b", "#f43f5e"]
                        delegate: Rectangle {
                            width: 28; height: 28; radius: 14
                            color: modelData
                            border.color: createBookRoot.selectedColor === modelData ? "#ffffff" : "transparent"
                            border.width: 2
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: createBookRoot.selectedColor = modelData
                            }
                        }
                    }
                }
            }

            Item { Layout.fillHeight: true }

            // Actions Footer
            RowLayout {
                Layout.fillWidth: true
                spacing: 12
                Item { Layout.fillWidth: true }
                Rectangle {
                    width: 90; height: 38; radius: 8; color: "#211f30"
                    Text { anchors.centerIn: parent; text: "Cancelar"; color: "#a7a9be"; font.pixelSize: 12 }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: createBookRoot.closed()
                    }
                }
                Rectangle {
                    width: 120; height: 38; radius: 8; color: "#7c3aed"
                    Text { anchors.centerIn: parent; text: "Criar Livro"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            if (newBookTitle.text.trim().length === 0) return
                            var p = parseInt(newBookPages.text) || 100
                            createBookRoot.bookCreated(newBookTitle.text.trim(), newBookAuthor.text.trim(), p, createBookRoot.selectedColor)
                            createBookRoot.closed()
                        }
                    }
                }
            }
        }
    }
}
