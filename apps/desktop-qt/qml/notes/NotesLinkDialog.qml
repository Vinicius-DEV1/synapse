import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "NotesHtmlEscaping.js" as HtmlEscaping

Dialog {
    id: linkDialog
    modal: true
    anchors.centerIn: parent
    width: Math.min(parent.width - 32, 440)
    padding: 0
    closePolicy: Popup.CloseOnEscape
    standardButtons: Dialog.NoButton

    property string originalHtml: ""
    property string originalLabel: ""
    property string labelText: ""
    property string targetUrl: ""
    property bool hasExistingLink: false

    signal linkCreated(string html)
    signal linkRemoved()

    function openFor(selectedHtml, plainText, existingUrl) {
        originalHtml = selectedHtml || ""
        originalLabel = plainText || ""
        labelText = originalLabel
        targetUrl = existingUrl || ""
        hasExistingLink = targetUrl.length > 0
        open()
    }

    function normalizedUrl() {
        var value = targetUrl.trim()
        return /^(https?:\/\/[^\s/?#<>"']+(?:[/?#][^\s<>"']*)?|mailto:[^\s<>"']+)$/i.test(value)
            ? value : ""
    }

    function createLink() {
        var safeUrl = normalizedUrl()
        var label = labelText.trim()
        if (!safeUrl || !label) return
        var content = originalHtml.length > 0 && label === originalLabel
            ? originalHtml : HtmlEscaping.escapeHtmlText(label)
        linkCreated("<a href=\"" + HtmlEscaping.escapeHtmlAttribute(safeUrl) + "\">" + content + "</a>")
        close()
    }

    onOpened: urlField.forceActiveFocus()

    background: Rectangle { color: "#181720"; radius: 14; border.color: "#10ffffff" }

    header: Rectangle {
        implicitHeight: 58
        color: "#08ffffff"
        radius: 14
        Rectangle { anchors.bottom: parent.bottom; width: parent.width; height: 1; color: "#0cffffff" }
        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: 18
            anchors.rightMargin: 10
            Label {
                Layout.fillWidth: true
                text: "Insert link"
                color: "#f4f4f5"
                font.pixelSize: 14
                font.bold: true
            }
            ToolButton {
                text: "×"
                Accessible.name: "Close link dialog"
                onClicked: linkDialog.close()
                contentItem: Text { text: parent.text; color: "#a7a9be"; font.pixelSize: 22; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
        }
    }

    contentItem: ColumnLayout {
        spacing: 8
        Label { text: "Link text"; color: "#b8b7c7"; font.pixelSize: 11 }
        TextField {
            Layout.fillWidth: true
            text: linkDialog.labelText
            onTextChanged: linkDialog.labelText = text
            placeholderText: "Text to display"
            selectByMouse: true
        }
        Label { text: "URL"; color: "#b8b7c7"; font.pixelSize: 11; topPadding: 4 }
        TextField {
            id: urlField
            Layout.fillWidth: true
            text: linkDialog.targetUrl
            onTextChanged: linkDialog.targetUrl = text
            placeholderText: "https://example.com or mailto:name@example.com"
            inputMethodHints: Qt.ImhUrlCharactersOnly
            selectByMouse: true
        }
        Label {
            visible: linkDialog.targetUrl.trim().length > 0 && linkDialog.normalizedUrl().length === 0
            text: "Use an http, https, or mailto link."
            color: "#fda4af"
            font.pixelSize: 10
        }
    }

    footer: RowLayout {
        implicitHeight: 58
        spacing: 8
        Item { Layout.fillWidth: true }
        Button {
            visible: linkDialog.hasExistingLink
            text: qsTr("Remove link")
            onClicked: {
                linkDialog.linkRemoved()
                linkDialog.close()
            }
        }
        Button { text: "Cancel"; onClicked: linkDialog.close() }
        Button {
            text: "Insert link"
            enabled: linkDialog.normalizedUrl().length > 0 && linkDialog.labelText.trim().length > 0
            onClicked: linkDialog.createLink()
            background: Rectangle { color: parent.enabled ? (parent.down ? "#6d28d9" : "#7c3aed") : "#343344"; radius: 8 }
            contentItem: Label { text: parent.text; color: parent.enabled ? "white" : "#9293a5"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter; leftPadding: 8; rightPadding: 8 }
        }
        Item { Layout.preferredWidth: 8 }
    }
}
