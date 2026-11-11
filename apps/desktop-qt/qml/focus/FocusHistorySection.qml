import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: historyRoot
    Layout.preferredWidth: 380
    Layout.fillHeight: true
    radius: 16
    color: "#1a1924" // bg-dark-card
    border.color: "#0fffffff"
    border.width: 1

    property var lofis: []
    property var focusSessions: []
    property var activeLofi: null
    property bool isLofiPlaying: false

    signal lofiSelected(var lofi)
    signal deleteSessionRequested(string sessionId)

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 20
        spacing: 16

        RowLayout {
            Layout.fillWidth: true
            Text {
                text: "🎵 Trilhas Ambientais Lofi"
                color: "#fffffe"
                font.pixelSize: 15
                font.bold: true
            }
            Item { Layout.fillWidth: true }
            Text {
                visible: historyRoot.isLofiPlaying
                text: "▶ Tocando"
                color: "#10b981"
                font.pixelSize: 11
                font.bold: true
            }
        }

        ListView {
            id: lofiList
            Layout.fillWidth: true
            Layout.preferredHeight: 140
            clip: true
            model: historyRoot.lofis
            spacing: 8

            delegate: Rectangle {
                id: lofiRowDelegate
                width: lofiList.width
                height: 44
                radius: 8
                color: historyRoot.activeLofi === modelData ? "#268b5cf6" : (lofiRowMouse.containsMouse ? "#211f30" : "#15141b")
                border.color: historyRoot.activeLofi === modelData ? "#808b5cf6" : "#0affffff"
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 12

                    Text {
                        text: historyRoot.activeLofi === modelData && historyRoot.isLofiPlaying ? "🔊" : "🎧"
                        font.pixelSize: 14
                    }

                    Text {
                        Layout.fillWidth: true
                        text: modelData.title || modelData.original_name || "Trilha Lofi"
                        color: historyRoot.activeLofi === modelData ? "#c4b5fd" : "#fffffe"
                        font.pixelSize: 13
                        elide: Text.ElideRight
                    }

                    Text {
                        text: (modelData.duration || 0) + "s"
                        color: "#a7a9be"
                        font.pixelSize: 11
                    }
                }

                MouseArea {
                    id: lofiRowMouse
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    hoverEnabled: true
                    onClicked: historyRoot.lofiSelected(modelData)
                }
            }

            Text {
                anchors.centerIn: parent
                visible: historyRoot.lofis.length === 0
                text: "Nenhuma trilha de áudio catalogada."
                color: "#64748b"
                font.pixelSize: 12
            }
        }

        Rectangle { Layout.fillWidth: true; height: 1; color: "#0fffffff" }

        // Session History Section
        RowLayout {
            Layout.fillWidth: true
            Text {
                text: "📜 Histórico de Sessões"
                color: "#fffffe"
                font.pixelSize: 15
                font.bold: true
            }
            Item { Layout.fillWidth: true }
            Text {
                text: historyRoot.focusSessions.length + " registradas"
                color: "#a7a9be"
                font.pixelSize: 12
            }
        }

        ListView {
            id: historyList
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            model: historyRoot.focusSessions
            spacing: 8

            delegate: Rectangle {
                width: historyList.width
                height: 54
                radius: 8
                color: "#15141b"
                border.color: "#0affffff"

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 12

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 2
                        RowLayout {
                            spacing: 8
                            Text {
                                text: modelData.tag || "Estudo"
                                color: "#fffffe"
                                font.pixelSize: 13
                                font.bold: true
                            }
                            Text {
                                text: "• " + (modelData.target_time_minutes || 25) + " min"
                                color: "#c4b5fd"
                                font.pixelSize: 12
                            }
                        }
                        Text {
                            text: modelData.created_at ? Qt.formatDateTime(new Date(modelData.created_at), "dd/MM/yyyy às hh:mm") : ""
                            color: "#64748b"
                            font.pixelSize: 11
                        }
                    }

                    // Delete Session
                    Rectangle {
                        width: 28; height: 28; radius: 6
                        color: delSessMouse.containsMouse ? "#26f43f5e" : "transparent"
                        Text { anchors.centerIn: parent; text: "🗑️"; font.pixelSize: 11 }
                        MouseArea {
                            id: delSessMouse
                            anchors.fill: parent; hoverEnabled: true; cursorShape: Qt.PointingHandCursor
                            onClicked: historyRoot.deleteSessionRequested(modelData.id)
                        }
                    }
                }
            }

            Text {
                anchors.centerIn: parent
                visible: historyRoot.focusSessions.length === 0
                text: "Nenhuma sessão registrada."
                color: "#64748b"
                font.pixelSize: 13
            }
        }
    }
}
