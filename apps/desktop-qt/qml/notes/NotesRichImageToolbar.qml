pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: imageToolbar
    property bool active: false
    property string alignment: "center"
    property bool canMoveUp: false
    property bool canMoveDown: false
    property bool actionsEnabled: false
    property string copyState: "idle"
    visible: active
    implicitWidth: active ? 12 * 28 + 11 * 4 : 0
    implicitHeight: 30

    signal alignmentRequested(string alignment)
    signal moveRequested(bool upward)
    signal paragraphBelowRequested()
    signal fitRequested()
    signal resetRequested()
    signal copyRequested()
    signal downloadRequested()
    signal viewRequested()
    signal deleteRequested()

    RowLayout {
        anchors.fill: parent
        spacing: 4

        Repeater {
            model: ["left", "center", "right"]
            delegate: Rectangle {
                id: alignmentButton
                required property string modelData
                readonly property string accessibleLabel: modelData === "left" ? qsTr("Align image left")
                    : modelData === "right" ? qsTr("Align image right") : qsTr("Center image")
                Layout.preferredWidth: 28
                Layout.preferredHeight: 26
                radius: 4
                color: imageToolbar.alignment === modelData ? "#1b8b5cf6" : "#08ffffff"
                Accessible.name: accessibleLabel
                ToolTip.visible: alignmentMouse.containsMouse
                ToolTip.text: accessibleLabel
                Text {
                    anchors.centerIn: parent
                    text: alignmentButton.modelData === "left" ? "⇤"
                        : alignmentButton.modelData === "right" ? "⇥" : "↔"
                    color: "#c4b5fd"
                    font.pixelSize: 14
                }
                MouseArea {
                    id: alignmentMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: imageToolbar.alignmentRequested(alignmentButton.modelData)
                }
            }
        }
        Rectangle {
            Layout.preferredWidth: 28
            Layout.preferredHeight: 26
            radius: 4
            enabled: imageToolbar.canMoveUp
            opacity: imageToolbar.canMoveUp ? 1 : 0.38
            color: moveUpMouse.containsMouse && imageToolbar.canMoveUp ? "#12ffffff" : "#08ffffff"
            Accessible.name: qsTr("Move image up")
            ToolTip.visible: moveUpMouse.containsMouse
            ToolTip.text: qsTr("Move image up")
            Text { anchors.centerIn: parent; text: "↑"; color: "#c4b5fd"; font.pixelSize: 14 }
            MouseArea {
                id: moveUpMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: imageToolbar.canMoveUp ? Qt.PointingHandCursor : Qt.ArrowCursor
                onClicked: imageToolbar.moveRequested(true)
            }
        }
        Rectangle {
            Layout.preferredWidth: 28
            Layout.preferredHeight: 26
            radius: 4
            enabled: imageToolbar.canMoveDown
            opacity: imageToolbar.canMoveDown ? 1 : 0.38
            color: moveDownMouse.containsMouse && imageToolbar.canMoveDown ? "#12ffffff" : "#08ffffff"
            Accessible.name: qsTr("Move image down")
            ToolTip.visible: moveDownMouse.containsMouse
            ToolTip.text: qsTr("Move image down")
            Text { anchors.centerIn: parent; text: "↓"; color: "#c4b5fd"; font.pixelSize: 14 }
            MouseArea {
                id: moveDownMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: imageToolbar.canMoveDown ? Qt.PointingHandCursor : Qt.ArrowCursor
                onClicked: imageToolbar.moveRequested(false)
            }
        }
        Rectangle {
            Layout.preferredWidth: 28
            Layout.preferredHeight: 26
            radius: 4
            color: fitMouse.containsMouse ? "#12ffffff" : "#08ffffff"
            Accessible.name: qsTr("Fit image to editor width")
            ToolTip.visible: fitMouse.containsMouse
            ToolTip.text: qsTr("Fit image to editor width")
            Text { anchors.centerIn: parent; text: "↔"; color: "#c4b5fd"; font.pixelSize: 14 }
            MouseArea {
                id: fitMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: imageToolbar.fitRequested()
            }
        }
        Rectangle {
            Layout.preferredWidth: 28
            Layout.preferredHeight: 26
            radius: 4
            color: resetMouse.containsMouse ? "#12ffffff" : "#08ffffff"
            Accessible.name: qsTr("Reset image size")
            ToolTip.visible: resetMouse.containsMouse
            ToolTip.text: qsTr("Reset image size")
            Text { anchors.centerIn: parent; text: "↺"; color: "#c4b5fd"; font.pixelSize: 14 }
            MouseArea {
                id: resetMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: imageToolbar.resetRequested()
            }
        }
        Rectangle {
            Layout.preferredWidth: 28
            Layout.preferredHeight: 26
            radius: 4
            color: paragraphMouse.containsMouse ? "#12ffffff" : "#08ffffff"
            Accessible.name: qsTr("Add paragraph below image")
            ToolTip.visible: paragraphMouse.containsMouse
            ToolTip.text: qsTr("Add paragraph below image")
            Text { anchors.centerIn: parent; text: "+"; color: "#c4b5fd"; font.pixelSize: 16 }
            MouseArea {
                id: paragraphMouse
                anchors.fill: parent
                hoverEnabled: true
                cursorShape: Qt.PointingHandCursor
                onClicked: imageToolbar.paragraphBelowRequested()
            }
        }
        ToolButton {
            objectName: "notesRichImageViewButton"
            Layout.preferredWidth: 28
            Layout.preferredHeight: 26
            padding: 2
            Accessible.name: qsTr("View or crop image")
            ToolTip.visible: hovered
            ToolTip.text: Accessible.name
            contentItem: Text {
                text: "⌕"
                color: "#c4b5fd"
                font.pixelSize: 18
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            onClicked: imageToolbar.viewRequested()
        }
        ToolButton {
            Layout.preferredWidth: 28
            Layout.preferredHeight: 26
            enabled: imageToolbar.actionsEnabled
            padding: 2
            Accessible.name: imageToolbar.copyState === "copied" ? qsTr("Image copied")
                : imageToolbar.copyState === "failed" ? qsTr("Image copy failed")
                : imageToolbar.copyState === "copying" ? qsTr("Copying image") : qsTr("Copy image")
            ToolTip.visible: hovered
            ToolTip.text: Accessible.name
            contentItem: Text {
                text: imageToolbar.copyState === "copied" ? "✓"
                    : imageToolbar.copyState === "failed" ? "!"
                    : imageToolbar.copyState === "copying" ? "…" : "⧉"
                color: imageToolbar.copyState === "copied" ? "#a7f3d0"
                    : imageToolbar.copyState === "failed" ? "#fda4af" : "#c4b5fd"
                font.pixelSize: 15
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            onClicked: imageToolbar.copyRequested()
        }
        ToolButton {
            Layout.preferredWidth: 28
            Layout.preferredHeight: 26
            enabled: imageToolbar.actionsEnabled
            padding: 2
            text: "↓"
            Accessible.name: qsTr("Download image")
            ToolTip.visible: hovered
            ToolTip.text: Accessible.name
            contentItem: Text {
                text: "↓"
                color: "#c4b5fd"
                font.pixelSize: 16
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            onClicked: imageToolbar.downloadRequested()
        }
        ToolButton {
            Layout.preferredWidth: 28
            Layout.preferredHeight: 26
            padding: 2
            text: "×"
            Accessible.name: qsTr("Delete image")
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Delete image")
            contentItem: Text {
                text: "×"
                color: "#fda4af"
                font.pixelSize: 18
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            onClicked: imageToolbar.deleteRequested()
        }
    }
}
