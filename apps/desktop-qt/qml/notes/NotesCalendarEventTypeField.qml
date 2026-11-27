import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: typeFieldRoot

    property var eventTypes: []
    property string selectedType: "mentoria"

    signal typeSelected(string value)

    Layout.fillWidth: true
    spacing: 4

    Text {
        objectName: "notesCalendarEventTypeLabel"
        text: qsTr("Tipo de Evento")
        color: "#a7a9be"
        font.pixelSize: 12
        font.weight: Font.Medium
    }

    ComboBox {
        id: eventTypeSelector
        objectName: "notesCalendarEventTypeSelector"
        Layout.fillWidth: true
        Layout.preferredHeight: 36
        model: typeFieldRoot.eventTypes
        textRole: "label"
        currentIndex: {
            for (var index = 0; index < typeFieldRoot.eventTypes.length; ++index) {
                if (typeFieldRoot.eventTypes[index].value === typeFieldRoot.selectedType) return index
            }
            return 0
        }
        onActivated: function(index) { typeFieldRoot.typeSelected(typeFieldRoot.eventTypes[index].value) }
        background: Rectangle { radius: 8; color: "#0f0e17"; border.color: "#2e2e38" }
        contentItem: Text {
            leftPadding: 10
            text: eventTypeSelector.displayText
            color: "#fffffe"
            font.pixelSize: 12
            verticalAlignment: Text.AlignVCenter
        }
    }
}
