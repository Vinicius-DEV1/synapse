import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

RowLayout {
    id: pickerHeader
    objectName: "notesMediaWidgetPickerHeader"

    property string mode: ""
    property bool closeEnabled: true

    signal closeRequested()

    Layout.fillWidth: true
    Layout.preferredHeight: mode === "video" || mode === "livro" ? 24 : -1

    AppIcon {
        visible: pickerHeader.mode === "video" || pickerHeader.mode === "livro"
        name: pickerHeader.mode === "livro" ? "book-open" : "film"
        color: pickerHeader.mode === "livro" ? "#60a5fa" : "#c084fc"
        Layout.preferredWidth: 18
        Layout.preferredHeight: 18
    }

    Text {
        objectName: "notesMediaWidgetPickerTitle"
        text: pickerHeader.mode === "documento" ? qsTr("Enviar Arquivo(s)")
            : pickerHeader.mode === "documento-link" ? qsTr("Enviar Arquivo(s) como link")
            : pickerHeader.mode === "file-select" ? qsTr("Vincular arquivo existente")
            : pickerHeader.mode === "video" ? qsTr("Vincular Vídeo")
            : pickerHeader.mode === "livro" ? qsTr("Vincular Livro")
            : qsTr("Snapshot Web Offline (Scrap)")
        color: "#fffffe"
        font.pixelSize: pickerHeader.mode === "documento" || pickerHeader.mode === "documento-link" ? 18 : 15
        font.weight: pickerHeader.mode === "documento" || pickerHeader.mode === "documento-link"
            ? Font.DemiBold : Font.Bold
        Layout.fillWidth: true
    }

    ToolButton {
        id: closeButton
        objectName: "notesMediaWidgetPickerCloseButton"
        Layout.preferredWidth: pickerHeader.mode === "documento" || pickerHeader.mode === "documento-link" ? 36 : 26
        Layout.preferredHeight: pickerHeader.mode === "documento" || pickerHeader.mode === "documento-link" ? 36 : 26
        enabled: pickerHeader.closeEnabled
        onClicked: pickerHeader.closeRequested()
        background: Rectangle {
            radius: pickerHeader.mode === "documento" || pickerHeader.mode === "documento-link" ? 8 : 6
            color: closeButton.hovered ? "#1affffff" : "transparent"
        }
        contentItem: AppIcon {
            anchors.centerIn: parent
            name: "close"
            color: "#94a1b2"
            width: pickerHeader.mode === "documento" || pickerHeader.mode === "documento-link" ||
                pickerHeader.mode === "video" || pickerHeader.mode === "livro" ? 18 : 12
            height: width
        }
    }
}
