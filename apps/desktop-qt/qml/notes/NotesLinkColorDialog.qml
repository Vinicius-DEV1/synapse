import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Dialog {
    id: colorDialog
    objectName: "notesLinkColorDialog"
    anchors.centerIn: parent
    width: Math.min(parent.width - 32, 360)
    modal: true
    title: qsTr("Link card color")
    standardButtons: Dialog.NoButton

    property string linkUrl: ""
    property int blockStart: -1
    property string currentColor: "default"
    property bool isSaving: false
    readonly property var palette: [
        { key: "default", name: qsTr("Default"), color: "default", selectedColor: currentColor,
          isSaving: isSaving, choose: function() { colorDialog.chooseColor("default") } },
        { key: "gray", name: qsTr("Gray"), color: "#9CA3AF", selectedColor: currentColor,
          isSaving: isSaving, choose: function() { colorDialog.chooseColor("#9CA3AF") } },
        { key: "brown", name: qsTr("Brown"), color: "#A8A29E", selectedColor: currentColor,
          isSaving: isSaving, choose: function() { colorDialog.chooseColor("#A8A29E") } },
        { key: "orange", name: qsTr("Orange"), color: "#F97316", selectedColor: currentColor,
          isSaving: isSaving, choose: function() { colorDialog.chooseColor("#F97316") } },
        { key: "yellow", name: qsTr("Yellow"), color: "#EAB308", selectedColor: currentColor,
          isSaving: isSaving, choose: function() { colorDialog.chooseColor("#EAB308") } },
        { key: "green", name: qsTr("Green"), color: "#22C55E", selectedColor: currentColor,
          isSaving: isSaving, choose: function() { colorDialog.chooseColor("#22C55E") } },
        { key: "blue", name: qsTr("Blue"), color: "#3B82F6", selectedColor: currentColor,
          isSaving: isSaving, choose: function() { colorDialog.chooseColor("#3B82F6") } },
        { key: "purple", name: qsTr("Purple"), color: "#A855F7", selectedColor: currentColor,
          isSaving: isSaving, choose: function() { colorDialog.chooseColor("#A855F7") } },
        { key: "pink", name: qsTr("Pink"), color: "#EC4899", selectedColor: currentColor,
          isSaving: isSaving, choose: function() { colorDialog.chooseColor("#EC4899") } },
        { key: "red", name: qsTr("Red"), color: "#EF4444", selectedColor: currentColor,
          isSaving: isSaving, choose: function() { colorDialog.chooseColor("#EF4444") } }
    ]

    signal colorSelected(string url, int start, string color)

    function openForLink(url, start, color) {
        linkUrl = url
        blockStart = start
        currentColor = color || "default"
        isSaving = false
        open()
    }

    function finishSave(succeeded) {
        isSaving = false
        if (succeeded) close()
    }

    function chooseColor(color) {
        if (isSaving) return
        isSaving = true
        colorSelected(linkUrl, blockStart, color)
    }

    background: Rectangle {
        color: "#1a1924"
        radius: 14
        border.color: "#18ffffff"
    }

    contentItem: ColumnLayout {
        spacing: 14

        Label {
            Layout.fillWidth: true
            text: colorDialog.linkUrl
            color: "#a7a9be"
            elide: Text.ElideMiddle
        }

        GridLayout {
            Layout.alignment: Qt.AlignHCenter
            columns: 5
            rowSpacing: 8
            columnSpacing: 8

            Repeater {
                model: colorDialog.palette
                delegate: NotesLinkColorSwatch {
                    required property var modelData
                    colorKey: modelData.key
                    colorName: modelData.name
                    colorValue: modelData.color
                    selectedColor: modelData.selectedColor
                    isSaving: modelData.isSaving
                    onColorChosen: modelData.choose()
                }
            }
        }

        Button {
            Layout.alignment: Qt.AlignRight
            text: qsTr("Cancel")
            Accessible.name: qsTr("Cancel link color selection")
            enabled: !colorDialog.isSaving
            onClicked: colorDialog.reject()
        }
    }
}
