import QtQuick 2.15
import QtQuick.Layouts 1.15

Item {
    id: visualizerRoot
    width: 140
    height: 36

    property bool isActive: false
    property color barColor: "#8b5cf6"
    property int barCount: 16

    Connections {
        target: typeof dataController !== "undefined" ? dataController : null
        function onAudioRecordingLevelChanged(level) {
            if (visualizerRoot.isActive) {
                var norm = Math.max(0.05, level / 100.0)
                for (var i = 0; i < barRepeater.count; i++) {
                    var item = barRepeater.itemAt(i)
                    if (item) {
                        var factor = 0.4 + 0.6 * Math.sin((i / barRepeater.count) * Math.PI)
                        item.targetHeight = Math.max(6, Math.floor(norm * factor * (visualizerRoot.height - 4)))
                    }
                }
            }
        }
    }

    RowLayout {
        anchors.fill: parent
        spacing: 3

        Repeater {
            id: barRepeater
            model: visualizerRoot.barCount

            Rectangle {
                id: barItem
                Layout.fillWidth: true
                Layout.alignment: Qt.AlignVCenter
                property int targetHeight: 6
                height: visualizerRoot.isActive ? targetHeight : 6
                radius: 2
                color: visualizerRoot.barColor

                Behavior on height {
                    NumberAnimation { duration: 70 }
                }
            }
        }
    }
}
