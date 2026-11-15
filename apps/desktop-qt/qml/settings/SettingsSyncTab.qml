import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: root
    Layout.fillWidth: true
    implicitHeight: contentCol.implicitHeight + 36
    radius: 14
    color: "#161524"
    border.color: "#18ffffff"
    border.width: 1

    property string syncStatus: "Sincronizado"
    property string syncFrequency: "30s"
    property bool isSyncing: false
    property string lastSyncTime: "Há poucos minutos"

    function triggerSync() {
        isSyncing = true
        syncTimer.start()
    }

    Timer {
        id: syncTimer
        interval: 900
        repeat: false
        onTriggered: {
            root.isSyncing = false
            root.lastSyncTime = "Agora mesmo"
            root.syncStatus = "Sincronizado com a nuvem"
        }
    }

    ColumnLayout {
        id: contentCol
        anchors.fill: parent
        anchors.margins: 20
        spacing: 16

        // Header
        RowLayout {
            Layout.fillWidth: true
            spacing: 10

            Text { text: "☁️"; font.pixelSize: 22 }
            ColumnLayout {
                spacing: 2
                Text {
                    text: "Sincronização em Nuvem (Zero-Knowledge)"
                    color: "#fffffe"
                    font.pixelSize: 16
                    font.bold: true
                }
                Text {
                    text: "Seus dados são criptografados antes do envio; a nuvem não possui suas chaves"
                    color: "#94a3b8"
                    font.pixelSize: 12
                }
            }

            Item { Layout.fillWidth: true }

            Rectangle {
                height: 26
                width: 130
                radius: 13
                color: "#1a22c55e"
                border.color: "#3322c55e"

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 6
                    Text { text: "🔒"; font.pixelSize: 11 }
                    Text { text: "Zero-Knowledge"; color: "#4ade80"; font.pixelSize: 11; font.bold: true }
                }
            }
        }

        Rectangle { Layout.fillWidth: true; height: 1; color: "#10ffffff" }

        // Sync Status & Trigger
        RowLayout {
            Layout.fillWidth: true
            spacing: 12

            ColumnLayout {
                spacing: 2
                Text { text: "Status: " + root.syncStatus; color: "#fffffe"; font.pixelSize: 13; font.bold: true }
                Text { text: "Última sincronização: " + root.lastSyncTime; color: "#94a3b8"; font.pixelSize: 11 }
            }

            Item { Layout.fillWidth: true }

            Button {
                Layout.preferredWidth: 150
                Layout.preferredHeight: 38
                text: root.isSyncing ? "Sincronizando…" : "↻ Sincronizar Agora"
                enabled: !root.isSyncing
                onClicked: root.triggerSync()

                background: Rectangle {
                    color: parent.enabled ? (parent.hovered ? "#4f46e5" : "#6366f1") : "#242332"
                    radius: 8
                }
                contentItem: Text {
                    text: parent.text
                    color: parent.enabled ? "#ffffff" : "#64748b"
                    font.pixelSize: 12
                    font.bold: true
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }
        }

        // Sync Frequency
        RowLayout {
            Layout.fillWidth: true
            spacing: 12

            Text { text: "Frequência de Sincronização Automática:"; color: "#d4d4dc"; font.pixelSize: 13 }
            Item { Layout.fillWidth: true }

            RowLayout {
                spacing: 6
                Repeater {
                    model: [
                        { id: "instant", label: "Instantâneo" },
                        { id: "30s",     label: "30 seg" },
                        { id: "5m",      label: "5 min" },
                        { id: "manual",  label: "Manual" }
                    ]
                    delegate: Rectangle {
                        width: freqText.contentWidth + 18
                        height: 28
                        radius: 6
                        color: root.syncFrequency === modelData.id ? "#6366f1" : "#1a1928"
                        border.color: "#20ffffff"

                        Text {
                            id: freqText
                            anchors.centerIn: parent
                            text: modelData.label
                            color: "#fffffe"
                            font.pixelSize: 11
                            font.bold: true
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: root.syncFrequency = modelData.id
                        }
                    }
                }
            }
        }
    }
}
