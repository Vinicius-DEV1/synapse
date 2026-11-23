import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Item {
    id: mediaPickerRoot
    anchors.fill: parent
    visible: activeMode.length > 0
    z: 140

    property string activeMode: "" // "documento" | "scrap" | "video" | "livro"
    property var listItems: []

    signal insertWidgetRequested(string html)
    signal closed()

    function openMode(mode) {
        activeMode = mode
        listItems = []
        if (typeof dataController === "undefined" || !dataController) return
        if (mode === "documento" && typeof dataController.getFiles === "function") {
            listItems = dataController.getFiles("") || []
        } else if (mode === "video" && typeof dataController.getVideos === "function") {
            listItems = dataController.getVideos() || []
        } else if (mode === "livro" && typeof dataController.getLibraryBooks === "function") {
            listItems = dataController.getLibraryBooks("") || []
        }
    }

    function close() { activeMode = ""; closed() }

    Rectangle {
        anchors.fill: parent
        color: "#b0000000"
        MouseArea { anchors.fill: parent; onClicked: mediaPickerRoot.close() }
    }

    Rectangle {
        width: 440
        height: Math.min(parent.height - 48, cardCol.implicitHeight + 40)
        anchors.centerIn: parent
        radius: 16
        color: "#161522"
        border.color: "#338b5cf6"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            id: cardCol
            anchors.fill: parent
            anchors.margins: 20
            spacing: 12

            RowLayout {
                Layout.fillWidth: true
                Text {
                    text: mediaPickerRoot.activeMode === "documento" ? qsTr("Vincular Arquivo do Drive")
                        : mediaPickerRoot.activeMode === "video" ? qsTr("Vincular Vídeo")
                        : mediaPickerRoot.activeMode === "livro" ? qsTr("Vincular Livro da Biblioteca")
                        : qsTr("Inserir Captura Web")
                    color: "#fffffe"
                    font.pixelSize: 15
                    font.bold: true
                    Layout.fillWidth: true
                }
                ToolButton {
                    Layout.preferredWidth: 26
                    Layout.preferredHeight: 26
                    onClicked: mediaPickerRoot.close()
                    background: Rectangle { radius: 6; color: parent.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: "#94a1b2"; width: 12; height: 12 }
                }
            }

            ScrollView {
                visible: mediaPickerRoot.activeMode !== "scrap"
                Layout.fillWidth: true
                Layout.preferredHeight: 250
                clip: true
                ColumnLayout {
                    width: parent.width
                    spacing: 6
                    Repeater {
                        model: mediaPickerRoot.listItems
                        delegate: Button {
                            required property var modelData
                            Layout.fillWidth: true
                            Layout.preferredHeight: 40
                            onClicked: {
                                var label = String(modelData.name || modelData.title || "Item").replace(/"/g, "&quot;")
                                if (mediaPickerRoot.activeMode === "documento") {
                                    mediaPickerRoot.insertWidgetRequested("<div data-type=\"file-widget\" data-file-id=\"" + modelData.id + "\" data-file-name=\"" + label + "\" data-file-type=\"" + (modelData.file_type || "document") + "\" data-file-size=\"" + (modelData.file_size || 0) + "\"></div>")
                                } else {
                                    var mType = mediaPickerRoot.activeMode === "livro" ? "book" : "video"
                                    mediaPickerRoot.insertWidgetRequested("<div data-type=\"media-widget\" data-media-type=\"" + mType + "\" data-media-id=\"" + modelData.id + "\" data-title=\"" + label + "\"></div>")
                                }
                                mediaPickerRoot.close()
                            }
                            background: Rectangle { radius: 8; color: parent.hovered ? "#228b5cf6" : "#1d1c2e"; border.color: "#15ffffff" }
                            contentItem: Text {
                                text: modelData.name || modelData.title || ""
                                color: "#fffffe"
                                font.pixelSize: 12
                                elide: Text.ElideRight
                            }
                        }
                    }
                }
            }

            ColumnLayout {
                visible: mediaPickerRoot.activeMode === "scrap"
                Layout.fillWidth: true
                spacing: 8
                TextField {
                    id: scrapTitleInput
                    Layout.fillWidth: true
                    placeholderText: qsTr("Título do snapshot")
                    color: "#fffffe"
                    background: Rectangle { radius: 8; color: "#0f0e17"; border.color: "#2e2e38" }
                }
                TextField {
                    id: scrapUrlInput
                    Layout.fillWidth: true
                    placeholderText: "https://..."
                    color: "#fffffe"
                    background: Rectangle { radius: 8; color: "#0f0e17"; border.color: "#2e2e38" }
                }
                Button {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 36
                    onClicked: {
                        var t = (scrapTitleInput.text.trim() || "Captura Web").replace(/"/g, "&quot;")
                        var u = scrapUrlInput.text.trim().replace(/"/g, "&quot;")
                        mediaPickerRoot.insertWidgetRequested("<div data-type=\"scrap-widget\" data-title=\"" + t + "\" data-url=\"" + u + "\"></div>")
                        mediaPickerRoot.close()
                    }
                    background: Rectangle { radius: 8; color: "#7c3aed" }
                    contentItem: Text { text: qsTr("Inserir Captura"); color: "#ffffff"; font.pixelSize: 12; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                }
            }
        }
    }
}
