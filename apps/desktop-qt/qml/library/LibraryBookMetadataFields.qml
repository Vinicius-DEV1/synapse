import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: fields
    spacing: 5

    property string titleValue: ""
    property string authorValue: ""
    property string publisherValue: ""
    property string yearValue: ""
    property string languageValue: ""
    property string descriptionValue: ""
    property string statusValue: "not_started"
    property string metadataStatusMessage: ""
    property var collections: []
    property var selectedCollectionIds: []

    signal fieldEdited(string fieldName, string value)
    signal statusSelected(string status)
    signal collectionToggled(string collectionId, bool selected)

    function focusTitle() {
        titleField.forceActiveFocus()
    }

    Label {
        visible: fields.metadataStatusMessage.length > 0
        Layout.fillWidth: true
        text: fields.metadataStatusMessage
        color: "#86efac"
        font.pixelSize: 10
        wrapMode: Text.Wrap
    }
    Label { text: "Title"; color: "#b8b7c7"; font.pixelSize: 11 }
    TextField {
        id: titleField
        Layout.fillWidth: true
        text: fields.titleValue
        onTextChanged: if (text !== fields.titleValue) fields.fieldEdited("title", text)
        placeholderText: "Book title"
        selectByMouse: true
        color: "#f4f4f5"
        background: Rectangle { color: "#0f0e17"; radius: 9; border.color: titleField.activeFocus ? "#668b5cf6" : "#18ffffff" }
    }
    Label { text: "Author"; color: "#b8b7c7"; font.pixelSize: 11; topPadding: 3 }
    TextField {
        Layout.fillWidth: true
        text: fields.authorValue
        onTextChanged: if (text !== fields.authorValue) fields.fieldEdited("author", text)
        placeholderText: "Author name"
        selectByMouse: true
        color: "#f4f4f5"
        background: Rectangle { color: "#0f0e17"; radius: 9; border.color: "#18ffffff" }
    }
    RowLayout {
        Layout.fillWidth: true
        spacing: 10
        ColumnLayout {
            Layout.fillWidth: true
            Label { text: "Publisher"; color: "#b8b7c7"; font.pixelSize: 11 }
            TextField {
                Layout.fillWidth: true
                text: fields.publisherValue
                onTextChanged: if (text !== fields.publisherValue) fields.fieldEdited("publisher", text)
                placeholderText: "Publisher"
                selectByMouse: true
                color: "#f4f4f5"
                background: Rectangle { color: "#0f0e17"; radius: 9; border.color: "#18ffffff" }
            }
        }
        ColumnLayout {
            Layout.preferredWidth: 120
            Label { text: "Year"; color: "#b8b7c7"; font.pixelSize: 11 }
            TextField {
                Layout.fillWidth: true
                text: fields.yearValue
                onTextChanged: if (text !== fields.yearValue) fields.fieldEdited("year", text)
                placeholderText: "2024"
                inputMethodHints: Qt.ImhDigitsOnly
                color: "#f4f4f5"
                background: Rectangle { color: "#0f0e17"; radius: 9; border.color: "#18ffffff" }
            }
        }
    }
    Label { text: "Language"; color: "#b8b7c7"; font.pixelSize: 11; topPadding: 3 }
    TextField {
        Layout.fillWidth: true
        text: fields.languageValue
        onTextChanged: if (text !== fields.languageValue) fields.fieldEdited("language", text)
        placeholderText: "e.g. en, pt-BR"
        selectByMouse: true
        color: "#f4f4f5"
        background: Rectangle { color: "#0f0e17"; radius: 9; border.color: "#18ffffff" }
    }
    Label { text: "Description"; color: "#b8b7c7"; font.pixelSize: 11; topPadding: 3 }
    TextArea {
        Layout.fillWidth: true
        Layout.preferredHeight: 76
        text: fields.descriptionValue
        onTextChanged: if (text !== fields.descriptionValue) fields.fieldEdited("description", text)
        placeholderText: "Book summary or notes"
        wrapMode: TextEdit.Wrap
        selectByMouse: true
        color: "#f4f4f5"
        background: Rectangle { color: "#0f0e17"; radius: 9; border.color: "#18ffffff" }
    }
    Label { text: "Reading status"; color: "#b8b7c7"; font.pixelSize: 11; topPadding: 3 }
    LibraryBookEditStatusBar {
        status: fields.statusValue
        onStatusSelected: function(status) { fields.statusSelected(status) }
    }
    Label { text: "Collections"; color: "#b8b7c7"; font.pixelSize: 11; topPadding: 3 }
    LibraryBookEditCollections {
        collections: fields.collections
        selectedCollectionIds: fields.selectedCollectionIds
        onCollectionToggled: function(collectionId, selected) {
            fields.collectionToggled(collectionId, selected)
        }
    }
}
