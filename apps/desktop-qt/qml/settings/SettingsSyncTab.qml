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

    property string syncStatus: "Modo Local Offline (Zero-Knowledge)"
    property bool isSyncing: false
    property string lastSyncTime: "Persistência direta via SQLite WAL"

    function triggerCheckpoint() {
        isSyncing = true
        syncStatus = "Executando checkpoint SQLite WAL..."
        checkpointTimer.start()
    }

    Timer {
        id: checkpointTimer
        interval: 400
        repeat: false
        onTriggered: {
            dataController.executeSql("PRAGMA wal_checkpoint(PASSIVE);")
            root.isSyncing = false
            root.lastSyncTime = "Último checkpoint: agora mesmo"
            root.syncStatus = "Base Local Íntegra (SQLite WAL Ativo)"
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
                    text: "Sincronização em Nuvem & Armazenamento"
                    color: "#fffffe"
                    font.pixelSize: 16
                    font.bold: true
                }
                Text {
                    text: "Cliente Desktop opera em modo local soberano com persistência SQLite WAL de alta performance"
                    color: "#94a3b8"
                    font.pixelSize: 12
                }
            }

            Item { Layout.fillWidth: true }

            Rectangle {
                height: 26
                width: 140
                radius: 13
                color: "#1a818cf8"
                border.color: "#33818cf8"

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 6
                    Text { text: "🔒"; font.pixelSize: 11 }
                    Text { text: "Zero-Knowledge"; color: "#a78bfa"; font.pixelSize: 11; font.bold: true }
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
                Text { text: root.lastSyncTime; color: "#94a3b8"; font.pixelSize: 11 }
            }

            Item { Layout.fillWidth: true }

            Button {
                Layout.preferredWidth: 170
                Layout.preferredHeight: 38
                text: root.isSyncing ? "Otimizando…" : "⚡ Checkpoint WAL"
                enabled: !root.isSyncing
                onClicked: root.triggerCheckpoint()

                background: Rectangle {
                    color: parent.hovered ? "#342b58" : "#242335"
                    radius: 8
                    border.color: "#30ffffff"
                }
                contentItem: Text {
                    text: parent.text
                    color: "#ddd6fe"
                    font.pixelSize: 12
                    font.bold: true
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }
        }

        // Info Banner
        Rectangle {
            Layout.fillWidth: true
            height: 52
            radius: 8
            color: "#18201a35"
            border.color: "#33818cf8"

            RowLayout {
                anchors.fill: parent
                anchors.margins: 12
                spacing: 10
                Text { text: "ℹ️"; font.pixelSize: 16 }
                Text {
                    text: "Sincronização remota via nuvem centralizada não está configurada neste perfil local. Seus dados estão 100% gravados no seu disco com chaves locais."
                    color: "#c4b5fd"
                    font.pixelSize: 11
                    Layout.fillWidth: true
                    wrapMode: Text.WordWrap
                }
            }
        }
    }
}
