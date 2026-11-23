import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: moveRoot
    anchors.fill: parent
    visible: isOpen
    color: "#b0000000"
    z: 145

    property bool isOpen: false
    property var movingBattery: null
    property var options: []

    signal moveConfirmed(string batteryId, string newParentId)
    signal closed()

    function openFor(battery) {
        movingBattery = battery
        options = typeof dataController !== "undefined" && dataController && typeof dataController.getAvailableQuizParentOptions === "function"
            ? (dataController.getAvailableQuizParentOptions(battery ? battery.id : "") || [])
            : []
        isOpen = true
    }

    MouseArea { anchors.fill: parent; onClicked: moveRoot.closed() }

    Rectangle {
        width: 420
        height: Math.min(parent.height - 64, 440)
        anchors.centerIn: parent
        radius: 16
        color: "#161524"
        border.color: "#338b5cf6"

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 20
            spacing: 12

            RowLayout {
                Layout.fillWidth: true
                Text {
                    text: qsTr("Mover bateria: ") + (moveRoot.movingBattery ? moveRoot.movingBattery.title : "")
                    color: "#fffffe"
                    font.pixelSize: 14
                    font.bold: true
                    elide: Text.ElideRight
                    Layout.fillWidth: true
                }
                ToolButton {
                    Layout.preferredWidth: 26
                    Layout.preferredHeight: 26
                    onClicked: moveRoot.closed()
                    background: Rectangle { radius: 6; color: parent.hovered ? "#1affffff" : "transparent" }
                    contentItem: AppIcon { anchors.centerIn: parent; name: "close"; color: "#94a1b2"; width: 12; height: 12 }
                }
            }

            Button {
                Layout.fillWidth: true
                Layout.preferredHeight: 36
                onClicked: {
                    if (moveRoot.movingBattery) moveRoot.moveConfirmed(moveRoot.movingBattery.id, "")
                    moveRoot.closed()
                }
                background: Rectangle { radius: 8; color: parent.hovered ? "#228b5cf6" : "#1d1c2e"; border.color: "#22ffffff" }
                contentItem: Text { text: qsTr("Raiz (Todas as Baterias)"); color: "#c4b5fd"; font.pixelSize: 12; font.bold: true }
            }

            ListView {
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true
                spacing: 6
                model: moveRoot.options
                delegate: Button {
                    required property var modelData
                    width: parent ? parent.width : 360
                    height: 36
                    onClicked: {
                        if (moveRoot.movingBattery) moveRoot.moveConfirmed(moveRoot.movingBattery.id, modelData.id)
                        moveRoot.closed()
                    }
                    background: Rectangle { radius: 8; color: parent.hovered ? "#228b5cf6" : "#13121e"; border.color: "#14ffffff" }
                    contentItem: Text { text: modelData.title || qsTr("Bateria"); color: "#fffffe"; font.pixelSize: 12; elide: Text.ElideRight }
                }
            }
        }
    }
}
