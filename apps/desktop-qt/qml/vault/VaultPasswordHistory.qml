pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Layouts 1.15
import ".."

ColumnLayout {
    id: historyRoot
    spacing: 8
    Layout.fillWidth: true

    property string itemId: ""
    property var history: []
    property string copiedId: ""

    function reloadHistory() {
        if (!itemId || itemId.length === 0) {
            history = []
            return
        }
        history = dataController.getPasswordHistory(itemId)
    }

    onItemIdChanged: reloadHistory()
    Component.onCompleted: reloadHistory()

    Timer {
        id: copyTimer
        interval: 2000
        onTriggered: historyRoot.copiedId = ""
    }

    // Empty state
    Rectangle {
        visible: !historyRoot.history || historyRoot.history.length === 0
        Layout.fillWidth: true
        Layout.preferredHeight: 70
        radius: 12
        color: "#0f0e17"
        border.color: "#22222d"
        border.width: 1

        RowLayout {
            anchors.centerIn: parent
            spacing: 8

            AppIcon {
                name: "history"
                color: "#6b7280"
                Layout.preferredWidth: 16
                Layout.preferredHeight: 16
            }

            Text {
                text: "Nenhuma senha antiga registrada."
                color: "#6b7280"
                font.pixelSize: 12
            }
        }
    }

    // History Entries
    Repeater {
        model: historyRoot.history

        delegate: Rectangle {
            id: historyDelegate
            required property var modelData
            required property int index

            property bool isRevealed: false
            readonly property bool isCopied: historyRoot.copiedId === (historyDelegate.modelData.id || "")

            Layout.fillWidth: true
            Layout.preferredHeight: 56
            radius: 10
            color: "#0f0e17"
            border.color: "#2a2a36"
            border.width: 1

            RowLayout {
                anchors.fill: parent
                anchors.margins: 10
                spacing: 12

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2

                    Text {
                        text: "Alterada em: " + (historyDelegate.modelData.changed_at ? new Date(historyDelegate.modelData.changed_at).toLocaleString(Qt.locale(), Locale.ShortFormat) : "—")
                        color: "#a7a9be"
                        font.pixelSize: 11
                    }

                    Text {
                        text: historyDelegate.isRevealed ? (historyDelegate.modelData.password || "") : "••••••••••••"
                        color: "#fffffe"
                        font.family: "monospace"
                        font.pixelSize: 12
                    }
                }

                // Reveal Toggle
                Rectangle {
                    Layout.preferredWidth: 28
                    Layout.preferredHeight: 28
                    radius: 6
                    color: revMouse.containsMouse ? "#2a2a36" : "transparent"

                    AppIcon {
                        anchors.centerIn: parent
                        name: historyDelegate.isRevealed ? "eye-off" : "eye"
                        color: "#9ca3af"
                        Layout.preferredWidth: 14
                        Layout.preferredHeight: 14
                    }

                    MouseArea {
                        id: revMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: historyDelegate.isRevealed = !historyDelegate.isRevealed
                    }
                }

                // Copy Button
                Rectangle {
                    Layout.preferredWidth: 28
                    Layout.preferredHeight: 28
                    radius: 6
                    color: historyDelegate.isCopied ? "#14532d" : (copyMouse.containsMouse ? "#2a2a36" : "#1a1a24")

                    AppIcon {
                        anchors.centerIn: parent
                        name: historyDelegate.isCopied ? "check" : "copy"
                        color: historyDelegate.isCopied ? "#4ade80" : "#a7a9be"
                        Layout.preferredWidth: 14
                        Layout.preferredHeight: 14
                    }

                    MouseArea {
                        id: copyMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            dataController.copyToClipboard(historyDelegate.modelData.password || "")
                            historyRoot.copiedId = historyDelegate.modelData.id || ""
                            copyTimer.restart()
                        }
                    }
                }
            }
        }
    }
}
