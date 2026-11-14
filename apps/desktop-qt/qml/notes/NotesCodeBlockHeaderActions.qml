import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

pragma ComponentBehavior: Bound

Item {
    id: actionsRoot
    objectName: "notesCodeBlockHeaderActions"
    implicitWidth: actionsRow.implicitWidth
    implicitHeight: actionsRow.implicitHeight

    property string language: "auto"
    property bool copied: false
    property bool copySucceeded: false
    property int copyRevision: 0
    property bool canMoveUp: false
    property bool canMoveDown: false
    property var dropTarget: null
    readonly property real dragThreshold: 8
    signal languageRequested(string language)
    signal moveRequested(bool upward)
    signal dropRequested(int targetPosition, bool afterTarget)
    signal copyRequested()
    signal paragraphBelowRequested()
    signal deleteRequested()

    RowLayout {
        id: actionsRow
        anchors.fill: parent
        spacing: 6

        RowLayout {
            spacing: 5
            Rectangle { Layout.preferredWidth: 9; Layout.preferredHeight: 9; radius: 4.5; color: "#ff5f56" }
            Rectangle { Layout.preferredWidth: 9; Layout.preferredHeight: 9; radius: 4.5; color: "#ffbd2e" }
            Rectangle { Layout.preferredWidth: 9; Layout.preferredHeight: 9; radius: 4.5; color: "#27c93f" }
            Rectangle { Layout.preferredWidth: 1; Layout.preferredHeight: 12; color: "#20ffffff" }
        }

        NotesCodeLanguageSelector {
            language: actionsRoot.language
            onLanguageRequested: function(value) { actionsRoot.languageRequested(value) }
        }

        ToolButton {
            id: moveUpButton
            objectName: "notesCodeMoveUpButton"
            Layout.preferredWidth: 27
            Layout.preferredHeight: 26
            padding: 2
            enabled: actionsRoot.canMoveUp
            text: "↑"
            Accessible.name: qsTr("Move code block up")
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Move code block up")
            contentItem: Text {
                text: "↑"
                color: moveUpButton.enabled ? "#c4b5fd" : "#6b6b7b"
                font.pixelSize: 12
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            onClicked: actionsRoot.moveRequested(true)
        }

        ToolButton {
            id: moveDownButton
            objectName: "notesCodeMoveDownButton"
            Layout.preferredWidth: 27
            Layout.preferredHeight: 26
            padding: 2
            enabled: actionsRoot.canMoveDown
            text: "↓"
            Accessible.name: qsTr("Move code block down")
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Move code block down")
            contentItem: Text {
                text: "↓"
                color: moveDownButton.enabled ? "#c4b5fd" : "#6b6b7b"
                font.pixelSize: 12
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            onClicked: actionsRoot.moveRequested(false)
        }

        ToolButton {
            id: dragButton
            objectName: "notesCodeDragButton"
            Layout.preferredWidth: 27
            Layout.preferredHeight: 26
            padding: 2
            enabled: actionsRoot.dropTarget !== null
            text: "⋮⋮"
            Accessible.name: qsTr("Drag code block to reposition")
            ToolTip.visible: hovered || dragMouseArea.containsMouse
            ToolTip.text: qsTr("Drag code block to reposition")
            contentItem: Text {
                text: dragButton.text
                color: dragButton.enabled ? "#c4b5fd" : "#6b6b7b"
                font.pixelSize: 12
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            MouseArea {
                id: dragMouseArea
                anchors.fill: parent
                enabled: actionsRoot.dropTarget !== null
                hoverEnabled: true
                preventStealing: true
                acceptedButtons: Qt.LeftButton
                cursorShape: pressed ? Qt.ClosedHandCursor : Qt.OpenHandCursor
                property real pressX: 0
                property real pressY: 0
                property bool dragging: false
                onPressed: function(mouse) {
                    pressX = mouse.x
                    pressY = mouse.y
                    dragging = false
                }
                onPositionChanged: function(mouse) {
                    if (!pressed || dragging) return
                    var deltaX = mouse.x - pressX
                    var deltaY = mouse.y - pressY
                    dragging = deltaX * deltaX + deltaY * deltaY >=
                        actionsRoot.dragThreshold * actionsRoot.dragThreshold
                }
                onReleased: function(mouse) {
                    if (!dragging) return
                    dragging = false
                    var point = dragMouseArea.mapToItem(actionsRoot.dropTarget, mouse.x, mouse.y)
                    var targetPosition = actionsRoot.dropTarget.positionAt(point.x, point.y)
                    if (targetPosition < 0) return
                    var targetRect = actionsRoot.dropTarget.positionToRectangle(targetPosition)
                    actionsRoot.dropRequested(targetPosition,
                                              point.y > targetRect.y + targetRect.height / 2)
                }
            }
        }

        ToolButton {
            id: paragraphButton
            objectName: "notesCodeParagraphBelowButton"
            Layout.preferredWidth: 92
            Layout.preferredHeight: 26
            padding: 3
            text: qsTr("+ Paragraph")
            Accessible.name: qsTr("Add paragraph below code block")
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Add paragraph below code block")
            contentItem: Text {
                text: paragraphButton.text
                color: "#ddd6fe"
                font.pixelSize: 11
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            background: Rectangle {
                radius: 5
                color: paragraphButton.hovered ? "#1affffff" : "#08ffffff"
                border.color: "#18ffffff"
            }
            onClicked: actionsRoot.paragraphBelowRequested()
        }

        ToolButton {
            id: copyButton
            objectName: "notesCodeCopyButton"
            Layout.preferredWidth: 70
            Layout.preferredHeight: 26
            padding: 3
            text: actionsRoot.copied ? qsTr("Copied!") : qsTr("Copy")
            Accessible.name: actionsRoot.copied ? qsTr("Code copied") : qsTr("Copy code")
            ToolTip.visible: hovered
            ToolTip.text: actionsRoot.copied ? qsTr("Code copied") : qsTr("Copy code")
            contentItem: Text {
                text: copyButton.text
                color: actionsRoot.copied ? "#6ee7b7" : "#ddd6fe"
                font.pixelSize: 11
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            background: Rectangle {
                radius: 5
                color: copyButton.hovered ? "#1affffff" : "#08ffffff"
                border.color: actionsRoot.copied ? "#3b8b5cf6" : "#18ffffff"
            }
            onClicked: actionsRoot.copyRequested()
        }

        ToolButton {
            id: deleteButton
            objectName: "notesCodeDeleteButton"
            Layout.preferredWidth: 64
            Layout.preferredHeight: 26
            padding: 3
            text: qsTr("Delete")
            Accessible.name: qsTr("Delete code block")
            ToolTip.visible: hovered
            ToolTip.text: qsTr("Delete code block")
            contentItem: Text {
                text: deleteButton.text
                color: "#fda4af"
                font.pixelSize: 11
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
            background: Rectangle {
                radius: 5
                color: deleteButton.hovered ? "#1affffff" : "#08ffffff"
                border.color: "#28fb7185"
            }
            onClicked: deleteConfirmation.open()
        }
    }

    NotesCodeBlockDeleteConfirmation {
        id: deleteConfirmation
        parent: actionsRoot
        onConfirmed: actionsRoot.deleteRequested()
    }

    onCopyRevisionChanged: {
        copied = copySucceeded
        if (copied) copyFeedbackTimer.restart()
    }

    Timer {
        id: copyFeedbackTimer
        interval: 2000
        repeat: false
        onTriggered: actionsRoot.copied = false
    }
}
