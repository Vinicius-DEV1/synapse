import QtQuick 2.15
import QtQuick.Layouts 1.15
import ".."

ColumnLayout {
    id: authToggleRoot
    spacing: 12
    Layout.fillWidth: true

    property string loginType: "password"
    readonly property bool isGoogle: loginType === "google"
    signal typeChanged(string newType)

    Rectangle {
        Layout.fillWidth: true
        Layout.preferredHeight: 64
        radius: 12
        color: "#16161e"
        border.color: authToggleRoot.isGoogle ? "#4f46e5" : "#2e2e38"
        border.width: 1

        RowLayout {
            anchors.fill: parent
            anchors.margins: 12
            spacing: 12

            Rectangle {
                Layout.preferredWidth: 36
                Layout.preferredHeight: 36
                radius: 8
                color: "#1f1f2e"
                border.color: "#3a3a4c"
                border.width: 1

                GoogleGIcon {
                    anchors.centerIn: parent
                    size: 18
                }
            }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 2

                Text {
                    text: "Conta vinculada ao Google"
                    color: "#fffffe"
                    font.pixelSize: 13
                    font.weight: Font.DemiBold
                }

                Text {
                    text: "Login via 'Sign in with Google' (sem senha local)"
                    color: "#a7a9be"
                    font.pixelSize: 11
                }
            }

            // Custom Switch Toggle
            Rectangle {
                id: switchTrack
                Layout.preferredWidth: 44
                Layout.preferredHeight: 24
                radius: 12
                color: authToggleRoot.isGoogle ? "#7c3aed" : "#2e2e38"

                Behavior on color { ColorAnimation { duration: 150 } }

                Rectangle {
                    id: switchThumb
                    width: 18
                    height: 18
                    radius: 9
                    color: "#ffffff"
                    anchors.verticalCenter: parent.verticalCenter
                    x: authToggleRoot.isGoogle ? 22 : 4

                    Behavior on x { NumberAnimation { duration: 150; easing.type: Easing.InOutQuad } }
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: {
                        var nextType = authToggleRoot.isGoogle ? "password" : "google"
                        authToggleRoot.typeChanged(nextType)
                    }
                }
            }
        }
    }

    // Informative banner when Google SSO is enabled
    Rectangle {
        visible: authToggleRoot.isGoogle
        Layout.fillWidth: true
        Layout.preferredHeight: 44
        radius: 10
        color: "#1e1438"
        border.color: "#6d28d9"
        border.width: 1

        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: 12
            anchors.rightMargin: 12
            spacing: 8

            AppIcon {
                name: "check"
                color: "#a78bfa"
                Layout.preferredWidth: 16
                Layout.preferredHeight: 16
            }

            Text {
                Layout.fillWidth: true
                text: "Esta conta utiliza autenticação federada do Google. A senha local fica desabilitada."
                color: "#c4b5fd"
                font.pixelSize: 11
                wrapMode: Text.WordWrap
            }
        }
    }
}
