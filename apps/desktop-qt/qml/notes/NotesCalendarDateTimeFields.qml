import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

ColumnLayout {
    id: dateTimeFields

    property alias dateText: dateField.text
    property alias timeText: timeField.text
    readonly property bool isValid: {
        var dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateField.text)
        var timeParts = /^([01]\d|2[0-3]):[0-5]\d$/.exec(timeField.text)
        if (!dateParts || !timeParts) return false
        var year = Number(dateParts[1])
        var month = Number(dateParts[2])
        var day = Number(dateParts[3])
        var candidate = new Date(year, month - 1, day)
        return candidate.getFullYear() === year && candidate.getMonth() === month - 1 &&
            candidate.getDate() === day
    }

    spacing: 5

    RowLayout {
        Layout.fillWidth: true
        spacing: 10
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 4
            RowLayout {
                spacing: 4
                AppIcon { name: "calendar"; color: "#a7a9be"; Layout.preferredWidth: 12; Layout.preferredHeight: 12 }
                Text { text: qsTr("Data"); color: "#a7a9be"; font.pixelSize: 11 }
            }
            TextField {
                id: dateField
                Layout.fillWidth: true
                Layout.preferredHeight: 34
                placeholderText: "YYYY-MM-DD"
                validator: RegularExpressionValidator { regularExpression: /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/ }
                color: "#fffffe"
                font.pixelSize: 12
                background: Rectangle { radius: 8; color: "#0f0e17"; border.color: "#2e2e38" }
            }
        }
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 4
            RowLayout {
                spacing: 4
                AppIcon { name: "clock"; color: "#a7a9be"; Layout.preferredWidth: 12; Layout.preferredHeight: 12 }
                Text { text: qsTr("Hora"); color: "#a7a9be"; font.pixelSize: 11 }
            }
            TextField {
                id: timeField
                Layout.fillWidth: true
                Layout.preferredHeight: 34
                placeholderText: "HH:mm"
                validator: RegularExpressionValidator { regularExpression: /^(?:[01]\d|2[0-3]):[0-5]\d$/ }
                color: "#fffffe"
                font.pixelSize: 12
                background: Rectangle { radius: 8; color: "#0f0e17"; border.color: "#2e2e38" }
            }
        }
    }
    Text {
        visible: (dateField.text.length > 0 || timeField.text.length > 0) && !dateTimeFields.isValid
        text: qsTr("Informe uma data válida e um horário entre 00:00 e 23:59.")
        color: "#fda4af"
        font.pixelSize: 11
        wrapMode: Text.WordWrap
        Layout.fillWidth: true
    }
}
