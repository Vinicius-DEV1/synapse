import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Rectangle {
    id: categoryFilter
    color: "#0a0909"
    property var files: []
    property string activeCategory: "all"
    signal categorySelected(string category)

    function countFor(category) {
        if (category === "all") return files.length
        return files.filter(function(file) { return String(file.file_type || "other") === category }).length
    }

    function iconFor(category) {
        if (category === "pdf" || category === "text") return "notes"
        if (category === "epub") return "library"
        if (category === "video") return "video"
        if (category === "image") return "image"
        if (category === "archive") return "archive"
        if (category === "code") return "code"
        return "files"
    }

    Flickable {
        anchors.fill: parent
        anchors.leftMargin: 14
        anchors.rightMargin: 14
        contentWidth: categoryRow.implicitWidth
        contentHeight: height
        flickableDirection: Flickable.HorizontalFlick
        interactive: contentWidth > width
        clip: true

        Row {
            id: categoryRow
            height: parent.height
            spacing: 6
            anchors.verticalCenter: parent.verticalCenter

            Repeater {
                model: [
                    { id: "all", label: "Todos" },
                    { id: "pdf", label: "PDFs" },
                    { id: "epub", label: "E-books" },
                    { id: "image", label: "Imagens" },
                    { id: "video", label: "Vídeos" },
                    { id: "text", label: "Textos" },
                    { id: "code", label: "Códigos" },
                    { id: "archive", label: "Compactados" }
                ]
                delegate: Rectangle {
                    required property var modelData
                    visible: modelData.id === "all" || categoryFilter.countFor(modelData.id) > 0 || categoryFilter.activeCategory === modelData.id
                    width: categoryContents.implicitWidth + 20
                    height: 26
                    anchors.verticalCenter: parent.verticalCenter
                    radius: 14
                    color: categoryFilter.activeCategory === modelData.id ? "#1affffff" : "#05ffffff"
                    border.color: categoryFilter.activeCategory === modelData.id ? "#33ffffff" : "#0affffff"

                    RowLayout {
                        id: categoryContents
                        anchors.centerIn: parent
                        spacing: 6
                        AppIcon {
                            width: 12
                            height: 12
                            name: categoryFilter.iconFor(modelData.id)
                            color: categoryFilter.activeCategory === modelData.id ? theme.textSubtext : theme.textMuted
                        }
                        Text {
                            text: modelData.label
                            color: categoryFilter.activeCategory === modelData.id ? theme.textDark : theme.textSubtext
                            font.pixelSize: 9
                            font.bold: categoryFilter.activeCategory === modelData.id
                        }
                        Rectangle {
                            width: countText.implicitWidth + 10
                            height: 16
                            radius: 8
                            color: categoryFilter.activeCategory === modelData.id ? "#20ffffff" : "#08ffffff"
                            Text {
                                id: countText
                                anchors.centerIn: parent
                                text: String(categoryFilter.countFor(modelData.id))
                                color: categoryFilter.activeCategory === modelData.id ? theme.textDark : theme.textMuted
                                font.pixelSize: 8
                                font.family: theme.fontMono
                            }
                        }
                    }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: categoryFilter.categorySelected(modelData.id)
                    }
                }
            }

            Rectangle {
                visible: categoryFilter.activeCategory !== "all"
                width: visible ? clearText.implicitWidth + 20 : 0
                height: 24
                anchors.verticalCenter: parent.verticalCenter
                color: "transparent"
                Text {
                    id: clearText
                    anchors.centerIn: parent
                    text: "× Limpar"
                    color: theme.textMuted
                    font.pixelSize: 9
                }
                MouseArea {
                    anchors.fill: parent
                    onClicked: categoryFilter.categorySelected("all")
                }
            }
        }
    }
}
