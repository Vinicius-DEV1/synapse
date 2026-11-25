pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: drawersRoot
    Layout.fillWidth: true
    spacing: 0

    property bool showColorPicker: false
    property string accentColor: "default"
    property bool duplicatesOpen: false
    property var duplicatePages: []
    property bool notesExpanded: false
    property string notesText: ""

    signal colorSelected(string colorValue)
    signal duplicatePageClicked(string pageId)
    signal notesSaved(string text)

    Rectangle {
        visible: drawersRoot.showColorPicker
        Layout.fillWidth: true
        Layout.preferredHeight: 34
        color: "#14000000"

        RowLayout {
            anchors.verticalCenter: parent.verticalCenter
            anchors.right: parent.right
            anchors.rightMargin: 12
            spacing: 6

            Repeater {
                model: ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"]
                delegate: Rectangle {
                    required property string modelData
                    width: 15
                    height: 15
                    radius: 7.5
                    color: modelData
                    border.color: drawersRoot.accentColor === modelData ? "#ffffff" : "#33ffffff"
                    border.width: drawersRoot.accentColor === modelData ? 1.5 : 1
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: drawersRoot.colorSelected(parent.modelData)
                    }
                }
            }

            Button {
                Layout.preferredHeight: 20
                leftPadding: 6
                rightPadding: 6
                focusPolicy: Qt.NoFocus
                onClicked: drawersRoot.colorSelected("default")
                background: Rectangle { radius: 4; color: parent.hovered ? "#1affffff" : "transparent"; border.color: "#22ffffff" }
                contentItem: Text { text: qsTr("Padrão"); color: "#a7a9be"; font.pixelSize: 10 }
            }
        }
    }

    Rectangle {
        visible: drawersRoot.duplicatesOpen && drawersRoot.duplicatePages.length > 0
        Layout.fillWidth: true
        implicitHeight: dupCol.implicitHeight + 16
        color: "#1a000000"

        Rectangle { anchors.top: parent.top; anchors.left: parent.left; anchors.right: parent.right; height: 1; color: "#0dffffff" }

        ColumnLayout {
            id: dupCol
            anchors.fill: parent
            anchors.margins: 8
            spacing: 4
            Text { text: qsTr("Este link também aparece em:"); color: "#fbbf24"; font.pixelSize: 10; font.bold: true }
            Repeater {
                model: drawersRoot.duplicatePages
                delegate: Button {
                    required property var modelData
                    Layout.fillWidth: true
                    Layout.preferredHeight: 26
                    onClicked: drawersRoot.duplicatePageClicked(modelData.pageId)
                    background: Rectangle { radius: 6; color: parent.hovered ? "#22f59e0b" : "#12121a" }
                    contentItem: Text {
                        text: (parent.modelData.pageIcon || "📄") + " " + (parent.modelData.pageTitle || qsTr("Página"))
                        color: "#fde68a"
                        font.pixelSize: 11
                    }
                }
            }
        }
    }

    Rectangle {
        visible: drawersRoot.notesExpanded
        Layout.fillWidth: true
        implicitHeight: notesArea.contentHeight + 24
        color: "#26000000"

        Rectangle { anchors.top: parent.top; anchors.left: parent.left; anchors.right: parent.right; height: 1; color: "#0dffffff" }

        TextArea {
            id: notesArea
            anchors.fill: parent
            anchors.margins: 8
            text: drawersRoot.notesText
            placeholderText: qsTr("Escreva anotações sobre este link...")
            placeholderTextColor: "#52525b"
            color: "#e2e8f0"
            font.pixelSize: 12
            wrapMode: TextEdit.Wrap
            background: Item {}
            onEditingFinished: drawersRoot.notesSaved(text)
        }
    }
}
