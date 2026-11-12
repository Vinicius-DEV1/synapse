pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15

Item {
    id: captionEditor

    property bool active: false
    property var imageState: ({ valid: false, position: -1, caption: "", width: 240 })
    property var captionItems: []
    property var textEditor: null
    property string draft: ""
    property bool resizing: false
    readonly property bool captionFocused: captionField.activeFocus

    signal draftEdited(string text)
    signal commitRequested()

    Repeater {
        model: captionEditor.captionItems
        delegate: Text {
            required property var modelData
            objectName: "notesRichImageCaption_" + modelData.position
            readonly property rect imageRect: captionEditor.textEditor.positionToRectangle(modelData.position)
            visible: captionEditor.active && captionEditor.imageState.position !== modelData.position
            x: Math.max(0, imageRect.x)
            y: imageRect.y + imageRect.height + 3
            width: Math.max(0, Math.min(Number(modelData.width), parent.width - x))
            text: modelData.caption
            color: "#a7a9be"
            font.pixelSize: 13
            font.italic: true
            horizontalAlignment: Text.AlignHCenter
            wrapMode: Text.Wrap
            z: 2
        }
    }

    TextField {
        id: captionField
        objectName: "notesRichImageCaptionInput"
        readonly property rect imageRect: captionEditor.imageState.valid
            ? captionEditor.textEditor.positionToRectangle(captionEditor.imageState.position)
            : Qt.rect(0, 0, 0, 0)
        visible: captionEditor.active && captionEditor.imageState.valid && !captionEditor.resizing
        x: Math.max(0, imageRect.x)
        y: imageRect.y + imageRect.height + 1
        width: Math.max(120, Math.min(Number(captionEditor.imageState.width || 240), parent.width - x))
        height: 29
        padding: 4
        text: captionEditor.draft
        placeholderText: qsTr("Write a caption…")
        horizontalAlignment: TextInput.AlignHCenter
        color: "#fffffe"
        selectByMouse: true
        Accessible.name: qsTr("Image caption")
        background: Rectangle {
            color: captionField.activeFocus ? "#201e2d" : "#10101a"
            border.color: captionField.activeFocus ? "#7c6fa8" : "#18ffffff"
            radius: 4
        }
        onTextEdited: captionEditor.draftEdited(text)
        onEditingFinished: captionEditor.commitRequested()
        onActiveFocusChanged: if (!activeFocus && visible) captionEditor.commitRequested()
        z: 3
    }
}
