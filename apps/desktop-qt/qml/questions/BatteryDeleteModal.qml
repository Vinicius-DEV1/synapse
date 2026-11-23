import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: deleteModalRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: isOpen
    z: 160

    property bool isOpen: false
    property var battery: null
    property bool hasSubgroups: false

    signal confirmed(string batteryId)
    signal closed()

    readonly property string batteryTitle: (battery && battery.title && battery.title.length > 0) ? battery.title : qsTr("Sem título")
    readonly property int questionsCount: (battery && battery.questions) ? battery.questions.length : ((battery && battery.question_count) ? battery.question_count : 0)

    Shortcut {
        sequence: "Escape"
        enabled: deleteModalRoot.visible
        onActivated: deleteModalRoot.closed()
    }

    MouseArea {
        anchors.fill: parent
        onClicked: deleteModalRoot.closed()
    }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 32, 420)
        implicitHeight: modalCol.implicitHeight + 48
        radius: 16
        color: "#161524"
        border.color: "#38354d"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            id: modalCol
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            RowLayout {
                Layout.fillWidth: true
                spacing: 14
                alignment: Qt.AlignTop

                Rectangle {
                    width: 40
                    height: 40
                    radius: 20
                    color: "#26f43f5e"
                    border.color: "#4df43f5e"
                    border.width: 1
                    Layout.alignment: Qt.AlignTop

                    Text {
                        anchors.centerIn: parent
                        text: "🗑"
                        font.pixelSize: 18
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 6

                    Text {
                        text: qsTr("Excluir Bateria")
                        color: "#fffffe"
                        font.pixelSize: 16
                        font.bold: true
                    }

                    Text {
                        Layout.fillWidth: true
                        text: qsTr("Deseja realmente mover a bateria \"%1\" (%2 questões) para a lixeira?")
                            .arg(deleteModalRoot.batteryTitle)
                            .arg(deleteModalRoot.questionsCount)
                        color: "#a1a1aa"
                        font.pixelSize: 12
                        wrapMode: Text.Wrap
                        lineHeight: 1.2
                    }

                    Rectangle {
                        visible: deleteModalRoot.hasSubgroups
                        Layout.fillWidth: true
                        implicitHeight: subNoticeText.implicitHeight + 16
                        radius: 8
                        color: "#0dffffff"
                        border.color: "#1affffff"
                        border.width: 1

                        Text {
                            id: subNoticeText
                            anchors.fill: parent
                            anchors.margins: 8
                            text: qsTr("ℹ️ Os subgrupos desta bateria não serão excluídos; eles serão mantidos e movidos para o nível principal.")
                            color: "#a1a1aa"
                            font.pixelSize: 11
                            wrapMode: Text.Wrap
                        }
                    }
                }
            }

            Item { Layout.preferredHeight: 8 }

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Item { Layout.fillWidth: true }

                Rectangle {
                    width: cancelBtnText.contentWidth + 24
                    height: 36
                    radius: 8
                    color: cancelMouse.containsMouse ? "#1affffff" : "transparent"

                    Text {
                        id: cancelBtnText
                        anchors.centerIn: parent
                        text: qsTr("Cancelar")
                        color: "#a1a1aa"
                        font.pixelSize: 12
                        font.bold: true
                    }

                    MouseArea {
                        id: cancelMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: deleteModalRoot.closed()
                    }
                }

                Rectangle {
                    width: delBtnText.contentWidth + 28
                    height: 36
                    radius: 8
                    color: delMouse.containsMouse ? "#f43f5e" : "#e11d48"

                    Text {
                        id: delBtnText
                        anchors.centerIn: parent
                        text: qsTr("Excluir Bateria")
                        color: "#ffffff"
                        font.pixelSize: 12
                        font.bold: true
                    }

                    MouseArea {
                        id: delMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            var batId = deleteModalRoot.battery ? deleteModalRoot.battery.id : ""
                            deleteModalRoot.closed()
                            if (batId.length > 0) {
                                deleteModalRoot.confirmed(batId)
                            }
                        }
                    }
                }
            }
        }
    }
}
