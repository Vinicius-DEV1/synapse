import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

RowLayout {
    id: headerRoot

    property bool isDirty: false
    property bool saveFailed: false
    property bool isPreviewMode: false
    property bool isRichMode: false
    property bool canUseRichMode: false
    property bool actionsVisible: false
    property string pageDate: ""
    property int wordCount: 0
    property int characterCount: 0

    signal saveRequested()
    signal deleteRequested()
    signal previewToggled(bool preview)
    signal historyRequested()
    signal moveRequested()
    signal helpRequested()
    signal shareRequested()
    signal richModeRequested(bool enabled)

    spacing: 4
    opacity: actionsVisible ? 1 : 0
    Behavior on opacity { NumberAnimation { duration: 150 } }

    ToolButton {
        Layout.preferredWidth: 30
        Layout.preferredHeight: 30
        text: headerRoot.isRichMode ? "⌨" : "¶"
        enabled: headerRoot.isRichMode || headerRoot.canUseRichMode
        Accessible.name: headerRoot.isRichMode ? qsTr("Switch to source editing") : qsTr("Switch to visual editing")
        ToolTip.visible: hovered
        ToolTip.text: headerRoot.isRichMode ? qsTr("Source editing") : headerRoot.canUseRichMode ? qsTr("Visual editing") : qsTr("This note uses formatting not supported in visual editing")
        onClicked: headerRoot.richModeRequested(!headerRoot.isRichMode)
        background: Rectangle { color: parent.hovered ? "#1a8b5cf6" : "transparent"; radius: 8 }
        contentItem: Text { text: parent.text; color: parent.enabled ? "#a7a9be" : "#51515d"; font.pixelSize: 15; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
    }

    ToolButton {
        Layout.preferredWidth: 30
        Layout.preferredHeight: 30
        text: "?"
        Accessible.name: qsTr("Notes guide")
        ToolTip.visible: hovered
        ToolTip.text: qsTr("Notes guide")
        onClicked: headerRoot.helpRequested()
    }

    ToolButton {
        Layout.preferredWidth: 30
        Layout.preferredHeight: 30
        text: headerRoot.isPreviewMode ? "✎" : "◉"
        Accessible.name: headerRoot.isPreviewMode ? qsTr("Edit note") : qsTr("Preview note")
        onClicked: headerRoot.previewToggled(!headerRoot.isPreviewMode)
        ToolTip.visible: hovered
        ToolTip.text: headerRoot.isPreviewMode ? qsTr("Edit") : qsTr("Preview")
        background: Rectangle { color: parent.hovered ? "#1a8b5cf6" : "transparent"; radius: 8 }
        contentItem: Text { text: parent.text; color: parent.hovered ? "#ddd6fe" : "#a7a9be"; font.pixelSize: 15; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
    }

    ToolButton {
        Layout.preferredWidth: 30
        Layout.preferredHeight: 30
        text: "↗"
        Accessible.name: qsTr("Move page")
        onClicked: headerRoot.moveRequested()
        ToolTip.visible: hovered
        ToolTip.text: qsTr("Move to…")
        background: Rectangle { color: parent.hovered ? "#1a8b5cf6" : "transparent"; radius: 8 }
        contentItem: Text { text: parent.text; color: parent.hovered ? "#ddd6fe" : "#a7a9be"; font.pixelSize: 15; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
    }

    ToolButton {
        Layout.preferredWidth: 30
        Layout.preferredHeight: 30
        text: "🔗"
        Accessible.name: qsTr("Share page")
        onClicked: headerRoot.shareRequested()
        ToolTip.visible: hovered
        ToolTip.text: qsTr("Share with link…")
        background: Rectangle { color: parent.hovered ? "#1a8b5cf6" : "transparent"; radius: 8 }
        contentItem: Text { text: parent.text; color: parent.hovered ? "#ddd6fe" : "#a7a9be"; font.pixelSize: 13; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
    }

    ToolButton {
        Layout.preferredWidth: 30
        Layout.preferredHeight: 30
        text: "◷"
        Accessible.name: qsTr("Edit history")
        onClicked: headerRoot.historyRequested()
        ToolTip.visible: hovered
        ToolTip.text: qsTr("History")
        background: Rectangle { color: parent.hovered ? "#1a8b5cf6" : "transparent"; radius: 8 }
        contentItem: Text { text: parent.text; color: parent.hovered ? "#ddd6fe" : "#a7a9be"; font.pixelSize: 15; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
    }

    ToolButton {
        Layout.preferredWidth: 74
        Layout.preferredHeight: 30
        Accessible.name: headerRoot.saveFailed ? qsTr("Retry saving note") : qsTr("Save note")
        onClicked: headerRoot.saveRequested()
        readonly property int readingTimeMinutes: Math.max(1, Math.ceil(headerRoot.wordCount / 200))
        ToolTip.visible: hovered
        ToolTip.text: headerRoot.saveFailed
                       ? qsTr("The note is still unsaved. Check that the vault is unlocked, then retry.")
                       : qsTr("%1 · %2 words · %3 characters · %4 min read").arg(headerRoot.pageDate).arg(headerRoot.wordCount).arg(headerRoot.characterCount).arg(readingTimeMinutes)
        background: Rectangle {
            color: headerRoot.saveFailed ? "#24f43f5e" : headerRoot.isDirty ? "#8b5cf6" : "#0d10b981"
            border.color: headerRoot.saveFailed ? "#66f43f5e" : headerRoot.isDirty ? "#668b5cf6" : "#3310b981"
            radius: 8
        }
        contentItem: RowLayout {
            spacing: 4
            Text {
                text: headerRoot.saveFailed ? "⚠" : headerRoot.isDirty ? "●" : "✓"
                color: headerRoot.saveFailed ? "#fb7185" : headerRoot.isDirty ? "white" : "#34d399"
                font.pixelSize: 10
            }
            Text {
                text: headerRoot.saveFailed ? qsTr("Retry") : headerRoot.isDirty ? qsTr("Save") : qsTr("Saved")
                color: headerRoot.saveFailed ? "#fda4af" : headerRoot.isDirty ? "white" : "#34d399"
                font.pixelSize: 10
                font.bold: true
            }
        }
    }

    ToolButton {
        Layout.preferredWidth: 30
        Layout.preferredHeight: 30
        text: "▤"
        Accessible.name: qsTr("Delete note")
        onClicked: headerRoot.deleteRequested()
        ToolTip.visible: hovered
        ToolTip.text: qsTr("Move to Trash")
        background: Rectangle { color: parent.hovered ? "#24f43f5e" : "#10f43f5e"; radius: 8 }
        contentItem: Text { text: parent.text; color: "#fda4af"; font.pixelSize: 14; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
    }
}
