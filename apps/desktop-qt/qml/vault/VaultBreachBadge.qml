import QtQuick 2.15
import QtQuick.Layouts 1.15
import ".."

Item {
    id: breachBadgeRoot
    property string password: ""
    property var breachResult: null
    property bool isChecking: false

    implicitWidth: badgeContent.implicitWidth
    implicitHeight: badgeContent.implicitHeight

    Connections {
        target: dataController
        function onPasswordBreachChecked(pwd, res) {
            if (pwd === breachBadgeRoot.password) {
                breachBadgeRoot.breachResult = res
                breachBadgeRoot.isChecking = false
            }
        }
    }

    function checkBreach() {
        if (!password || password.length === 0) {
            breachResult = null
            isChecking = false
            return
        }
        isChecking = true
        checkTimer.restart()
    }

    Timer {
        id: checkTimer
        interval: 300
        repeat: false
        onTriggered: {
            dataController.checkPasswordBreachAsync(breachBadgeRoot.password)
        }
    }

    onPasswordChanged: checkBreach()
    Component.onCompleted: checkBreach()

    Item {
        id: badgeContent
        implicitWidth: checkingRect.visible ? checkingRect.implicitWidth : (breachedRect.visible ? breachedRect.implicitWidth : safeRect.implicitWidth)
        implicitHeight: checkingRect.visible ? checkingRect.implicitHeight : (breachedRect.visible ? breachedRect.implicitHeight : safeRect.implicitHeight)

        // Loading state
        Rectangle {
            id: checkingRect
            visible: breachBadgeRoot.isChecking
            implicitWidth: checkRow.implicitWidth + 16
            implicitHeight: 28
            radius: 8
            color: "#1f1f2e"

            RowLayout {
                id: checkRow
                anchors.centerIn: parent
                spacing: 6

                AppIcon {
                    name: "loader"
                    color: "#a7a9be"
                    Layout.preferredWidth: 14
                    Layout.preferredHeight: 14
                }

                Text {
                    text: "Checando vazamentos..."
                    color: "#a7a9be"
                    font.pixelSize: 11
                }
            }
        }

        // Breached state
        Rectangle {
            id: breachedRect
            visible: !breachBadgeRoot.isChecking && breachBadgeRoot.breachResult && breachBadgeRoot.breachResult.breached
            implicitWidth: 320
            implicitHeight: breachCol.implicitHeight + 16
            radius: 12
            color: "#2a151b"
            border.color: "#ef4444"
            border.width: 1

            ColumnLayout {
                id: breachCol
                anchors.fill: parent
                anchors.margins: 10
                spacing: 4

                RowLayout {
                    spacing: 6
                    AppIcon {
                        name: "alert"
                        color: "#ef4444"
                        Layout.preferredWidth: 16
                        Layout.preferredHeight: 16
                    }
                    Text {
                        text: "Senha Comprometida!"
                        color: "#ef4444"
                        font.pixelSize: 12
                        font.weight: Font.Bold
                    }
                }

                Text {
                    Layout.fillWidth: true
                    text: "Esta senha apareceu em " + (breachBadgeRoot.breachResult ? (breachBadgeRoot.breachResult.count || 0) : 0) + " vazamentos de dados na internet. Recomendamos alterá-la."
                    color: "#fca5a5"
                    font.pixelSize: 11
                    wrapMode: Text.WordWrap
                }
            }
        }

        // Safe state
        Rectangle {
            id: safeRect
            visible: !breachBadgeRoot.isChecking && breachBadgeRoot.breachResult && !breachBadgeRoot.breachResult.breached && !breachBadgeRoot.breachResult.error
            implicitWidth: safeRow.implicitWidth + 16
            implicitHeight: 28
            radius: 8
            color: "#132b21"
            border.color: "#10b981"
            border.width: 1

            RowLayout {
                id: safeRow
                anchors.centerIn: parent
                spacing: 6

                AppIcon {
                    name: "check"
                    color: "#10b981"
                    Layout.preferredWidth: 14
                    Layout.preferredHeight: 14
                }

                Text {
                    text: "Nenhum vazamento detectado"
                    color: "#6ee7b7"
                    font.pixelSize: 11
                    font.weight: Font.Medium
                }
            }
        }
    }
}
