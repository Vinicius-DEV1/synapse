import QtQuick 2.15
import QtQuick.Layouts 1.15
import "../ui"

Item {
    id: toastRoot
    property string status: "idle" // "idle", "syncing", "success", "error", "offline"

    visible: opacity > 0
    opacity: status === "idle" ? 0.0 : 0.85

    Behavior on opacity {
        NumberAnimation { duration: 400; easing.type: Easing.InOutQuad }
    }

    Timer {
        id: autoHideTimer
        interval: 3000
        repeat: false
        onTriggered: {
            if (toastRoot.status === "success") {
                toastRoot.status = "idle"
            }
        }
    }

    onStatusChanged: {
        if (status === "success") {
            autoHideTimer.restart()
        }
    }

    Theme { id: theme }

    Rectangle {
        id: toastCard
        anchors.right: parent.right
        anchors.bottom: parent.bottom
        anchors.margins: 16
        implicitWidth: toastRow.implicitWidth + 24
        implicitHeight: 32
        radius: 16
        color: theme.bgDarkSurface
        border.color: toastRoot.status === "error" ? theme.errorBorder :
                      (toastRoot.status === "success" ? theme.successBorder : theme.borderSubtle)
        border.width: 1

        RowLayout {
            id: toastRow
            anchors.centerIn: parent
            spacing: 6

            AppIcon {
                Layout.preferredWidth: 12
                Layout.preferredHeight: 12
                name: toastRoot.status === "syncing" ? "loader" :
                      (toastRoot.status === "success" ? "check" :
                      (toastRoot.status === "error" ? "alert" : "cloud"))
                color: toastRoot.status === "syncing" ? theme.brand400 :
                       (toastRoot.status === "success" ? theme.success :
                       (toastRoot.status === "error" ? theme.error : theme.textSubtext))

                RotationAnimation on rotation {
                    running: toastRoot.status === "syncing"
                    loops: Animation.Infinite
                    from: 0
                    to: 360
                    duration: 1000
                }
            }

            Text {
                text: {
                    if (toastRoot.status === "syncing") return qsTr("Salvando...")
                    if (toastRoot.status === "success") return qsTr("Salvo")
                    if (toastRoot.status === "error") return qsTr("Erro")
                    if (toastRoot.status === "offline") return qsTr("Offline")
                    return ""
                }
                color: toastRoot.status === "error" ? theme.error :
                       (toastRoot.status === "success" ? theme.success : theme.textSubtext)
                font.pixelSize: 10
                font.bold: true
                font.family: theme.fontFamily
                font.letterSpacing: 0.8
            }
        }
    }
}
