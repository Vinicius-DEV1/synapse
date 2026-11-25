import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: statusBanner
    visible: actionStatus.length > 0
    Layout.fillWidth: true
    Layout.preferredHeight: statusText.implicitHeight + 20
    Layout.topMargin: 8
    Layout.bottomMargin: 12
    radius: 8
    color: saveFailed ? "#26151a" : "#1f1d2b"
    border.color: saveFailed ? "#66f43f5e" : "#338b5cf6"
    border.width: 1

    property string actionStatus: ""
    property bool saveFailed: false

    signal historyRequested()
    signal dismissed()

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 12
        anchors.rightMargin: 12
        spacing: 10

        Text {
            text: statusBanner.saveFailed ? "⚠" : "ℹ"
            color: statusBanner.saveFailed ? "#fb7185" : "#a78bfa"
            font.pixelSize: 14
        }

        Text {
            id: statusText
            Layout.fillWidth: true
            text: statusBanner.actionStatus
            color: statusBanner.saveFailed ? "#fecdd3" : "#e0e7ff"
            font.pixelSize: 13
            wrapMode: Text.Wrap
        }

        Button {
            id: historyBtn
            visible: statusBanner.saveFailed
            text: qsTr("History")
            flat: true
            contentItem: Text {
                text: qsTr("History")
                color: "#fb7185"
                font.pixelSize: 12
                font.bold: true
            }
            background: Rectangle {
                color: historyBtn.hovered ? "#33f43f5e" : "#1af43f5e"
                radius: 4
            }
            onClicked: statusBanner.historyRequested()
        }

        ToolButton {
            text: "✕"
            flat: true
            contentItem: Text {
                text: "✕"
                color: "#a7a9be"
                font.pixelSize: 12
            }
            onClicked: statusBanner.dismissed()
        }
    }
}
