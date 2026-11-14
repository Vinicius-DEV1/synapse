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

    function formatDuration(sec) {
        if (!sec || isNaN(sec) || sec <= 0) return "--:--"
        var s = Math.floor(sec)
        var m = Math.floor(s / 60)
        var h = Math.floor(m / 60)
        s = s % 60
        m = m % 60
        if (h > 0) {
            return h + "h " + (m > 0 ? m + "m" : "")
        }
        return m + ":" + (s < 10 ? "0" + s : s)
    }

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
                readonly property bool isCurrent: historyRoot.activeLofi && historyRoot.activeLofi.id === modelData.id
                readonly property bool isLocal: modelData.is_local === 1 || (modelData.file_path && String(modelData.file_path).length > 0)
                color: isCurrent ? "#268b5cf6" : (lofiRowMouse.containsMouse ? "#211f30" : "#15141b")
                border.color: isCurrent ? "#808b5cf6" : "#0affffff"
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 8

                    Text {
                        text: lofiRowDelegate.isCurrent && historyRoot.isLofiPlaying ? "🔊" : "🎧"
                        font.pixelSize: 14
                    }

                    Text {
                        Layout.fillWidth: true
                        text: modelData.title || modelData.original_name || "Trilha Lofi"
                        color: lofiRowDelegate.isCurrent ? "#c4b5fd" : "#fffffe"
                        font.pixelSize: 12
                        elide: Text.ElideRight
                    }

                    Rectangle {
                        height: 18
                        radius: 4
                        color: lofiRowDelegate.isLocal ? "#1a10b981" : "#1a3b82f6"
                        border.color: lofiRowDelegate.isLocal ? "#3310b981" : "#333b82f6"
                        border.width: 1
                        implicitWidth: badgeText.implicitWidth + 8

                        Text {
                            id: badgeText
                            anchors.centerIn: parent
                            text: lofiRowDelegate.isLocal ? "Local" : "☁️ Nuvem"
                            color: lofiRowDelegate.isLocal ? "#34d399" : "#60a5fa"
                            font.pixelSize: 9
                            font.bold: true
                        }
                    }

                    Text {
                        text: historyRoot.formatDuration(modelData.duration)
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

        Rectangle {
            Layout.fillWidth: true
            height: 32
            radius: 6
            color: "#1af59e0b"
            border.color: "#33f59e0b"
            border.width: 1
            visible: typeof globalLofiPlayer !== "undefined" && globalLofiPlayer && globalLofiPlayer.playError !== ""

            RowLayout {
                anchors.fill: parent
                anchors.margins: 6
                spacing: 6

                Text {
                    text: "⚠️"
                    font.pixelSize: 12
                }

                Text {
                    Layout.fillWidth: true
                    text: (typeof globalLofiPlayer !== "undefined" && globalLofiPlayer) ? globalLofiPlayer.playError : ""
                    color: "#fcd34d"
                    font.pixelSize: 11
                    elide: Text.ElideRight
                }
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
