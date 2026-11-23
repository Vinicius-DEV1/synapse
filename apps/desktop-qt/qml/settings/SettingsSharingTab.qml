import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Item {
    id: sharingTabRoot
    Layout.fillWidth: true
    implicitHeight: contentCol.implicitHeight

    Theme { id: theme }

    property var sharedPagesList: []
    property string feedbackMessage: ""

    function loadSharedPages() {
        try {
            var json = dataController.getConfig("sharing_pages", "[]")
            sharedPagesList = JSON.parse(json) || []
        } catch (e) {
            sharedPagesList = []
        }
    }

    Component.onCompleted: {
        loadSharedPages()
    }

    function revokePage(pageId) {
        var updated = []
        for (var i = 0; i < sharedPagesList.length; i++) {
            if (sharedPagesList[i].id !== pageId) {
                updated.push(sharedPagesList[i])
            }
        }
        dataController.setConfig("sharing_pages", JSON.stringify(updated))
        sharedPagesList = updated
        feedbackMessage = qsTr("Compartilhamento revogado com sucesso.")
    }

    ColumnLayout {
        id: contentCol
        anchors.fill: parent
        spacing: 20

        // Header
        RowLayout {
            Layout.fillWidth: true
            spacing: 12

            RowLayout {
                spacing: 8
                AppIcon { width: 18; height: 18; name: "share"; color: theme.brand400 }
                Text {
                    text: qsTr("Gerenciamento de Páginas Compartilhadas")
                    color: theme.textDark
                    font.pixelSize: 15
                    font.bold: true
                }
            }

            Item { Layout.fillWidth: true }

            Rectangle {
                Layout.preferredWidth: 32
                Layout.preferredHeight: 32
                radius: 8
                color: refreshMouse.containsMouse ? theme.bgHover : theme.bgDarkSurface
                border.color: theme.borderSubtle

                AppIcon {
                    anchors.centerIn: parent
                    width: 14; height: 14
                    name: "refresh"
                    color: theme.textSubtext
                }

                MouseArea {
                    id: refreshMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: {
                        sharingTabRoot.loadSharedPages()
                        sharingTabRoot.feedbackMessage = qsTr("Lista de páginas compartilhadas atualizada.")
                    }
                }
            }
        }

        // Feedback Banner
        Rectangle {
            visible: sharingTabRoot.feedbackMessage.length > 0
            Layout.fillWidth: true
            Layout.preferredHeight: 38
            radius: 8
            color: theme.successBg
            border.color: theme.successBorder

            RowLayout {
                anchors.fill: parent
                anchors.margins: 10
                spacing: 8

                AppIcon { width: 14; height: 14; name: "check"; color: theme.success }
                Text {
                    Layout.fillWidth: true
                    text: sharingTabRoot.feedbackMessage
                    color: theme.success
                    font.pixelSize: 12
                }
                Text {
                    text: "✕"
                    color: theme.textSubtext
                    font.pixelSize: 12
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: sharingTabRoot.feedbackMessage = ""
                    }
                }
            }
        }

        // Shared Pages Card
        Rectangle {
            Layout.fillWidth: true
            radius: 12
            color: theme.bgDarkCard
            border.color: theme.borderCard
            Layout.preferredHeight: sharedCol.implicitHeight + 32

            ColumnLayout {
                id: sharedCol
                anchors.fill: parent
                anchors.margins: 16
                spacing: 16

                RowLayout {
                    spacing: 8
                    AppIcon { width: 16; height: 16; name: "notes"; color: theme.brand400 }
                    Text {
                        text: qsTr("Links Públicos e Colaborativos Ativos")
                        color: theme.textDark
                        font.pixelSize: 14
                        font.bold: true
                    }
                    Text {
                        text: "(" + sharingTabRoot.sharedPagesList.length + ")"
                        color: theme.textMuted
                        font.pixelSize: 12
                    }
                }

                Text {
                    text: qsTr("Visualize os links compartilhados do seu caderno, permissões atribuídas e revogue o acesso a qualquer momento.")
                    color: theme.textSubtext
                    font.pixelSize: 12
                }

                // Empty State
                Rectangle {
                    visible: sharingTabRoot.sharedPagesList.length === 0
                    Layout.fillWidth: true
                    Layout.preferredHeight: 120
                    radius: 10
                    color: theme.bgDarkSurface

                    ColumnLayout {
                        anchors.centerIn: parent
                        spacing: 8

                        AppIcon {
                            Layout.alignment: Qt.AlignHCenter
                            width: 28; height: 28
                            name: "share"
                            color: theme.textMuted
                        }

                        Text {
                            text: qsTr("Nenhuma página está compartilhada no momento.")
                            color: theme.textSubtext
                            font.pixelSize: 13
                        }

                        Text {
                            text: qsTr("Você pode compartilhar qualquer nota clicando no botão 'Compartilhar' no topo do editor.")
                            color: theme.textMuted
                            font.pixelSize: 11
                        }
                    }
                }

                // Shared Items List
                Repeater {
                    model: sharingTabRoot.sharedPagesList

                    delegate: Rectangle {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 64
                        radius: 8
                        color: theme.bgDarkSurface
                        border.color: theme.borderSubtle

                        RowLayout {
                            anchors.fill: parent
                            anchors.leftMargin: 12
                            anchors.rightMargin: 12
                            spacing: 12

                            Rectangle {
                                width: 36; height: 36; radius: 8
                                color: theme.activePillBg
                                AppIcon {
                                    anchors.centerIn: parent
                                    width: 16; height: 16
                                    name: "notes"
                                    color: theme.brand400
                                }
                            }

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2

                                Text {
                                    text: modelData.title || qsTr("Nota Compartilhada")
                                    color: theme.textDark
                                    font.pixelSize: 13
                                    font.bold: true
                                    elide: Text.ElideRight
                                }

                                RowLayout {
                                    spacing: 8
                                    Text {
                                        text: modelData.url || ("https://caderno.app/s/" + modelData.id)
                                        color: theme.textSubtext
                                        font.pixelSize: 11
                                        font.family: theme.fontMono
                                    }
                                    Rectangle {
                                        radius: 4
                                        color: theme.bgHover
                                        implicitWidth: permText.implicitWidth + 8
                                        implicitHeight: 16
                                        Text {
                                            id: permText
                                            anchors.centerIn: parent
                                            text: modelData.permission === "edit" ? qsTr("Pode editar") : qsTr("Apenas leitura")
                                            color: theme.brand300
                                            font.pixelSize: 9
                                            font.bold: true
                                        }
                                    }
                                }
                            }

                            // Revoke Action Button
                            Rectangle {
                                Layout.preferredWidth: 80
                                Layout.preferredHeight: 28
                                radius: 6
                                color: revokeMouse.containsMouse ? theme.errorBg : "transparent"
                                border.color: revokeMouse.containsMouse ? theme.errorBorder : theme.borderSubtle

                                Text {
                                    anchors.centerIn: parent
                                    text: qsTr("Revogar")
                                    color: revokeMouse.containsMouse ? theme.error : theme.textSubtext
                                    font.pixelSize: 11
                                    font.bold: true
                                }

                                MouseArea {
                                    id: revokeMouse
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: sharingTabRoot.revokePage(modelData.id)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
