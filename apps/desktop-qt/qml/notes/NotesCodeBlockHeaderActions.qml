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
    signal languageRequested(string language)
    signal copyRequested()
    signal paragraphBelowRequested()
    signal deleteRequested()

    RowLayout {
        id: actionsRow
        anchors.fill: parent
        spacing: 5

        NotesCodeLanguageSelector {
            language: actionsRoot.language
            onLanguageRequested: function(value) { actionsRoot.languageRequested(value) }
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
