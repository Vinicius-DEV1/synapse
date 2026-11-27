import QtQuick 2.15
import QtQuick.Layouts 1.15
import "../ui"

Rectangle {
    id: warningPanel
    objectName: "notesDeleteEventsWarning"
    property string pageName: ""
    property var events: []
    property int deletionCount: 0
    readonly property int inlineOnlyCount: Math.max(0, events.length - deletionCount)

    implicitHeight: warningContent.implicitHeight + 28
    radius: 12
    color: "#1af59e0b"
    border.color: "#4df59e0b"

    ColumnLayout {
        id: warningContent
        anchors.fill: parent
        anchors.margins: 14
        spacing: 8

        RowLayout {
            Layout.fillWidth: true
            spacing: 7
            AppIcon {
                Layout.preferredWidth: 15
                Layout.preferredHeight: 15
                name: "alert-triangle"
                color: "#fcd34d"
            }
            Text {
                Layout.fillWidth: true
                text: warningPanel.deletionCount > 0
                    ? qsTr("Atenção: %1 evento(s) serão removidos da Agenda.").arg(warningPanel.deletionCount)
                    : qsTr("Atenção: há %1 evento(s) mencionados no conteúdo.").arg(warningPanel.inlineOnlyCount)
                color: "#fcd34d"
                font.pixelSize: 12
                font.weight: Font.DemiBold
                wrapMode: Text.Wrap
            }
        }

        Text {
            objectName: "notesDeleteEventsDetail"
            Layout.fillWidth: true
            text: warningPanel.inlineOnlyCount > 0
                ? warningPanel.deletionCount > 0
                    ? qsTr("Eventos vinculados à página serão removidos. %1 referência(s) sem vínculo direto continuarão na Agenda após excluir %2.").arg(warningPanel.inlineOnlyCount).arg(warningPanel.pageName)
                    : qsTr("%1 referência(s) sem vínculo direto continuarão na Agenda após excluir %2.").arg(warningPanel.inlineOnlyCount).arg(warningPanel.pageName)
                : qsTr("Eventos vinculados à página e às subpáginas de %1 também serão removidos da Agenda.").arg(warningPanel.pageName)
            color: "#fde68a"
            opacity: 0.9
            font.pixelSize: 11
            wrapMode: Text.Wrap
        }

        ListView {
            id: eventList
            objectName: "notesDeleteEventList"
            Layout.fillWidth: true
            Layout.preferredHeight: Math.min(contentHeight, 128)
            visible: warningPanel.events.length > 0
            clip: true
            spacing: 6
            model: warningPanel.events
            delegate: Rectangle {
                id: eventDelegate
                required property var modelData
                width: ListView.view.width
                height: 46
                radius: 8
                color: "#4d000000"
                border.color: "#0dffffff"

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 8
                    anchors.rightMargin: 8
                    spacing: 8
                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 1
                        Text {
                            Layout.fillWidth: true
                            text: "📅 " + (eventDelegate.modelData.title || qsTr("Sem título"))
                            color: "#ffffff"
                            font.pixelSize: 11
                            font.weight: Font.Medium
                            elide: Text.ElideRight
                        }
                        RowLayout {
                            spacing: 4
                            AppIcon {
                                Layout.preferredWidth: 10
                                Layout.preferredHeight: 10
                                name: "book-open"
                                color: "#fbbf24"
                            }
                            Text {
                                Layout.fillWidth: true
                                text: qsTr("Em: %1").arg(eventDelegate.modelData.pageTitle || "")
                                color: "#fbbf24"
                                opacity: 0.8
                                font.pixelSize: 9
                                elide: Text.ElideRight
                            }
                        }
                    }
                    RowLayout {
                        spacing: 4
                        AppIcon {
                            Layout.preferredWidth: 11
                            Layout.preferredHeight: 11
                            name: "clock"
                            color: "#fcd34d"
                        }
                        Text {
                            text: eventDelegate.modelData.displayDate || qsTr("Sem data")
                            color: "#fde68a"
                            font.pixelSize: 10
                        }
                    }
                }
            }
        }
    }
}
