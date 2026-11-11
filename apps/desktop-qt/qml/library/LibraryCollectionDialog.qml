import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Dialog {
    id: collectionDialog
    modal: true
    anchors.centerIn: parent
    width: Math.min(parent.width - 32, 440)
    padding: 0
    standardButtons: Dialog.NoButton
    closePolicy: Popup.CloseOnEscape

    property var controller: null
    property var editingCollection: null
    property string nameText: ""
    property string colorValue: "#6366f1"
    property string errorMessage: ""

    signal saved()

    readonly property var palette: [
        { name: "Indigo", hex: "#6366f1" },
        { name: "Violet", hex: "#8b5cf6" },
        { name: "Purple", hex: "#a855f7" },
        { name: "Pink", hex: "#ec4899" },
        { name: "Rose", hex: "#f43f5e" },
        { name: "Amber", hex: "#f59e0b" },
        { name: "Emerald", hex: "#10b981" },
        { name: "Cyan", hex: "#06b6d4" },
        { name: "Blue", hex: "#3b82f6" },
        { name: "Lime", hex: "#84cc16" }
    ]

    function openFor(collection) {
        editingCollection = collection || null
        nameText = collection ? collection.name : ""
        colorValue = collection ? (collection.color || "#6366f1") : "#6366f1"
        errorMessage = ""
        open()
    }

    function saveCollection() {
        var normalizedName = nameText.trim()
        if (normalizedName.length === 0 || normalizedName.length > 60 || !controller) return
        var result = editingCollection
            ? controller.updateLibraryCollection(editingCollection.id, normalizedName, colorValue)
            : controller.createLibraryCollection(normalizedName, colorValue)
        if (result) {
            saved()
            close()
        } else {
            errorMessage = "Could not save the collection. Check the name and try again."
        }
    }

    onOpened: nameField.forceActiveFocus()

    background: Rectangle { color: "#181720"; radius: 16; border.color: "#10ffffff" }

    header: Rectangle {
        implicitHeight: 76
        color: "#08ffffff"
        radius: 16
        Rectangle { anchors.bottom: parent.bottom; width: parent.width; height: 1; color: "#0cffffff" }
        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: 20
            anchors.rightMargin: 12
            spacing: 12
            Rectangle {
                Layout.preferredWidth: 40
                Layout.preferredHeight: 40
                radius: 12
                color: Qt.darker(colorValue, 2.2)
                border.color: colorValue
                AppIcon { anchors.centerIn: parent; width: 20; height: 20; name: "folder"; color: collectionDialog.colorValue }
            }
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 3
                Label { text: collectionDialog.editingCollection ? "Edit Collection" : "New Collection"; color: "#f4f4f5"; font.pixelSize: 15; font.bold: true }
                Label { text: "Group and organize books in your library"; color: "#9293a5"; font.pixelSize: 11 }
            }
            ToolButton {
                text: "×"
                Accessible.name: "Close collection dialog"
                onClicked: collectionDialog.close()
                contentItem: Label { text: parent.text; color: parent.hovered ? "white" : "#a7a9be"; font.pixelSize: 22; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                background: Rectangle { color: parent.hovered ? "#1affffff" : "transparent"; radius: 8 }
            }
        }
    }

    contentItem: ColumnLayout {
        spacing: 14
        RowLayout {
            Layout.fillWidth: true
            Layout.leftMargin: 20
            Layout.rightMargin: 20
            Layout.topMargin: 18
            Label { text: "Collection name"; color: "#dedee5"; font.pixelSize: 11; font.weight: Font.Medium }
            Item { Layout.fillWidth: true }
            Label { text: collectionDialog.nameText.length + "/60"; color: "#77798c"; font.pixelSize: 10 }
        }
        TextField {
            id: nameField
            Layout.fillWidth: true
            Layout.leftMargin: 20
            Layout.rightMargin: 20
            text: collectionDialog.nameText
            maximumLength: 60
            placeholderText: "e.g. Science Fiction, Studies, Classics"
            color: "#f4f4f5"
            selectByMouse: true
            onTextChanged: collectionDialog.nameText = text
            background: Rectangle { color: "#0f0e17"; radius: 10; border.color: nameField.activeFocus ? "#668b5cf6" : "#18ffffff" }
        }
        Label {
            Layout.leftMargin: 20
            text: "Theme color"
            color: "#dedee5"
            font.pixelSize: 11
            font.weight: Font.Medium
        }
        GridLayout {
            Layout.leftMargin: 20
            Layout.rightMargin: 20
            columns: 5
            rowSpacing: 8
            columnSpacing: 9
            Repeater {
                model: collectionDialog.palette
                delegate: Button {
                    required property var modelData
                    Layout.fillWidth: true
                    Layout.preferredHeight: 34
                    Accessible.name: modelData.name
                    onClicked: collectionDialog.colorValue = modelData.hex
                    background: Rectangle {
                        color: modelData.hex
                        radius: 9
                        border.width: collectionDialog.colorValue === modelData.hex ? 2 : 1
                        border.color: collectionDialog.colorValue === modelData.hex ? "#e4e4e7" : "#40ffffff"
                    }
                    contentItem: Text {
                        text: collectionDialog.colorValue === modelData.hex ? "✓" : ""
                        color: "white"
                        font.pixelSize: 15
                        font.bold: true
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
            }
        }
        Rectangle {
            Layout.fillWidth: true
            Layout.leftMargin: 20
            Layout.rightMargin: 20
            Layout.topMargin: 4
            Layout.preferredHeight: 46
            radius: 10
            color: "#08ffffff"
            border.color: "#0cffffff"
            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 12
                anchors.rightMargin: 12
                Label { text: "Preview"; color: "#9293a5"; font.pixelSize: 11 }
                Item { Layout.fillWidth: true }
                Rectangle {
                    radius: 9
                    color: Qt.darker(collectionDialog.colorValue, 2.2)
                    border.color: collectionDialog.colorValue
                    Layout.preferredWidth: previewName.implicitWidth + 24
                    Layout.preferredHeight: 26
                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 6
                        Rectangle { width: 7; height: 7; radius: 4; color: collectionDialog.colorValue }
                        Label { id: previewName; text: collectionDialog.nameText.trim() || "Collection name"; color: collectionDialog.colorValue; font.pixelSize: 11; font.weight: Font.Medium }
                    }
                }
            }
        }
        Label {
            visible: collectionDialog.errorMessage.length > 0
            Layout.leftMargin: 20
            Layout.rightMargin: 20
            text: collectionDialog.errorMessage
            color: "#fda4af"
            font.pixelSize: 11
            wrapMode: Text.Wrap
        }
        Item { Layout.preferredHeight: 2 }
    }

    footer: RowLayout {
        implicitHeight: 62
        spacing: 10
        Item { Layout.fillWidth: true }
        Button { text: "Cancel"; onClicked: collectionDialog.close() }
        Button {
            text: collectionDialog.editingCollection ? "Save Changes" : "Create Collection"
            enabled: collectionDialog.nameText.trim().length > 0 && !!collectionDialog.controller
            onClicked: collectionDialog.saveCollection()
            background: Rectangle { color: parent.enabled ? (parent.down ? "#6d28d9" : "#7c3aed") : "#343344"; radius: 9 }
            contentItem: Label { text: parent.text; color: parent.enabled ? "white" : "#9293a5"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter; leftPadding: 8; rightPadding: 8 }
        }
        Item { Layout.preferredWidth: 10 }
    }
}
