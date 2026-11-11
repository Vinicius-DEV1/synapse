import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

RowLayout {
    id: statusBar
    Layout.fillWidth: true
    spacing: 6

    property string status: "not_started"
    signal statusSelected(string status)

    Repeater {
        model: [
            { id: "not_started", label: "Not started" },
            { id: "reading", label: "Reading" },
            { id: "finished", label: "Finished" }
        ]
        delegate: Button {
            required property var modelData
            Layout.fillWidth: true
            text: modelData.label
            onClicked: statusBar.statusSelected(modelData.id)
            background: Rectangle {
                radius: 8
                color: statusBar.status === modelData.id ? "#268b5cf6" : "#0f0e17"
                border.color: statusBar.status === modelData.id ? "#668b5cf6" : "#18ffffff"
            }
            contentItem: Text {
                text: parent.text
                color: statusBar.status === modelData.id ? "#ddd6fe" : "#a7a9be"
                font.pixelSize: 10
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
                wrapMode: Text.Wrap
            }
        }
    }
}
