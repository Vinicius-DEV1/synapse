import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: titleFieldRoot

    property alias text: titleInput.text

    Layout.fillWidth: true
    spacing: 4

    function forceActiveFocus() {
        titleInput.forceActiveFocus()
    }

    Text {
        objectName: "notesCalendarEventTitleLabel"
        text: qsTr("Título do Evento *")
        color: "#a7a9be"
        font.pixelSize: 12
        font.weight: Font.Medium
    }

    TextField {
        id: titleInput
        objectName: "notesCalendarEventTitleField"
        Layout.fillWidth: true
        Layout.preferredHeight: 36
        placeholderText: qsTr("Ex: Mentoria 01 - Arquitetura")
        color: "#fffffe"
        font.pixelSize: 12
        background: Rectangle { radius: 8; color: "#0f0e17"; border.color: "#2e2e38" }
    }
}
