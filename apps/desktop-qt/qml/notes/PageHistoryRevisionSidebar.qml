import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Rectangle {
    id: sidebarRoot
    objectName: "historyRevisionSidebar"

    property int viewportWidth: 0
    property var history: []
    property int selectedIndex: 0
    property var timestampFormatter
    readonly property Item currentRevisionItem: revisionList.currentItem

    signal revisionSelected(int index)

    Layout.preferredWidth: viewportWidth >= 640 ? 320 : 288
    Layout.fillHeight: true
    color: "#121214"
    border.color: "#08ffffff"

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 12
        spacing: 6

        Item {
            Layout.fillWidth: true
            Layout.fillHeight: true
            objectName: "historyRevisionListArea"

            ListView {
                id: revisionList
                anchors.fill: parent
                visible: sidebarRoot.history.length > 0
                clip: true
                spacing: 6
                model: sidebarRoot.history
                delegate: PageHistoryRevisionButton {
                    width: revisionList.width
                    selectedIndex: sidebarRoot.selectedIndex
                    historyCount: sidebarRoot.history.length
                    timestampText: sidebarRoot.timestampFormatter(modelData.created_at)
                    onRevisionSelected: function(index) { sidebarRoot.revisionSelected(index) }
                }
            }

            ColumnLayout {
                id: historyEmptyState
                objectName: "historyEmptyState"
                anchors.centerIn: parent
                visible: sidebarRoot.history.length === 0
                spacing: 8
                AppIcon {
                    objectName: "historyEmptyIcon"
                    Layout.alignment: Qt.AlignHCenter
                    width: 28
                    height: 28
                    name: "alert-circle"
                    color: theme.textMuted
                    opacity: 0.6
                }
                Text {
                    Layout.maximumWidth: revisionList.width - 24
                    Layout.alignment: Qt.AlignHCenter
                    text: "Nenhum histórico encontrado."
                    color: theme.textMuted
                    font.pixelSize: 12
                    horizontalAlignment: Text.AlignHCenter
                    wrapMode: Text.Wrap
                    opacity: 0.6
                }
            }
        }
    }

}
