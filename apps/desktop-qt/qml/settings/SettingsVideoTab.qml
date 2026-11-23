import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Item {
    id: videoTabRoot
    Layout.fillWidth: true
    implicitHeight: contentCol.implicitHeight

    Theme { id: theme }

    property string playbackPreference: "native"
    property bool hardwareAcceleration: true
    property string subtitleSize: "medium"
    property string subtitleColor: "#ffffff"
    property bool autoResumePosition: true
    property real defaultPlaybackSpeed: 1.0

    signal settingsChanged()

    Component.onCompleted: {
        playbackPreference = dataController.getConfig("video_playback_preference", "native")
        hardwareAcceleration = (dataController.getConfig("video_hw_accel", "true") === "true")
        subtitleSize = dataController.getConfig("video_subtitle_size", "medium")
        subtitleColor = dataController.getConfig("video_subtitle_color", "#ffffff")
        autoResumePosition = (dataController.getConfig("video_auto_resume", "true") === "true")
        var speedStr = dataController.getConfig("video_default_speed", "1.0")
        defaultPlaybackSpeed = parseFloat(speedStr) || 1.0
    }

    function savePreferences() {
        dataController.setConfig("video_playback_preference", playbackPreference)
        dataController.setConfig("video_hw_accel", hardwareAcceleration ? "true" : "false")
        dataController.setConfig("video_subtitle_size", subtitleSize)
        dataController.setConfig("video_subtitle_color", subtitleColor)
        dataController.setConfig("video_auto_resume", autoResumePosition ? "true" : "false")
        dataController.setConfig("video_default_speed", defaultPlaybackSpeed.toString())
    }

    ColumnLayout {
        id: contentCol
        anchors.fill: parent
        spacing: 20

        // 1. Playback Engine Card
        Rectangle {
            Layout.fillWidth: true
            radius: 12
            color: theme.bgDarkCard
            border.color: theme.borderCard
            Layout.preferredHeight: engineCol.implicitHeight + 32

            ColumnLayout {
                id: engineCol
                anchors.fill: parent
                anchors.margins: 16
                spacing: 14

                RowLayout {
                    spacing: 8
                    AppIcon { width: 16; height: 16; name: "video"; color: theme.brand400 }
                    Text {
                        text: qsTr("Mecanismo de Reprodução de Vídeo")
                        color: theme.textDark
                        font.pixelSize: 14
                        font.bold: true
                    }
                }

                Text {
                    text: qsTr("Escolha como os vídeos de estudo e faixas interativas são decodificados.")
                    color: theme.textSubtext
                    font.pixelSize: 12
                }

                // Radio Options
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    // Native MPV
                    Rectangle {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 60
                        radius: 10
                        color: videoTabRoot.playbackPreference === "native" ? theme.activePillBg : theme.bgDarkSurface
                        border.color: videoTabRoot.playbackPreference === "native" ? theme.brand500 : theme.borderSubtle
                        border.width: videoTabRoot.playbackPreference === "native" ? 1.5 : 1

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 10

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2
                                Text {
                                    text: qsTr("Nativo (libmpv GPU)")
                                    color: theme.textDark
                                    font.pixelSize: 13
                                    font.bold: true
                                }
                                Text {
                                    text: qsTr("Aceleração máxima por hardware e suporte universal a codecs")
                                    color: theme.textSubtext
                                    font.pixelSize: 11
                                }
                            }

                            AppIcon {
                                visible: videoTabRoot.playbackPreference === "native"
                                width: 16; height: 16; name: "check"; color: theme.brand400
                            }
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                videoTabRoot.playbackPreference = "native"
                                videoTabRoot.savePreferences()
                                videoTabRoot.settingsChanged()
                            }
                        }
                    }

                    // Auto Fallback
                    Rectangle {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 60
                        radius: 10
                        color: videoTabRoot.playbackPreference === "auto" ? theme.activePillBg : theme.bgDarkSurface
                        border.color: videoTabRoot.playbackPreference === "auto" ? theme.brand500 : theme.borderSubtle
                        border.width: videoTabRoot.playbackPreference === "auto" ? 1.5 : 1

                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 10

                            ColumnLayout {
                                Layout.fillWidth: true
                                spacing: 2
                                Text {
                                    text: qsTr("Automático")
                                    color: theme.textDark
                                    font.pixelSize: 13
                                    font.bold: true
                                }
                                Text {
                                    text: qsTr("Detecta a melhor renderização de acordo com o sistema")
                                    color: theme.textSubtext
                                    font.pixelSize: 11
                                }
                            }

                            AppIcon {
                                visible: videoTabRoot.playbackPreference === "auto"
                                width: 16; height: 16; name: "check"; color: theme.brand400
                            }
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                videoTabRoot.playbackPreference = "auto"
                                videoTabRoot.savePreferences()
                                videoTabRoot.settingsChanged()
                            }
                        }
                    }
                }
            }
        }

        // 2. Playback Behavior & Hardware Acceleration
        Rectangle {
            Layout.fillWidth: true
            radius: 12
            color: theme.bgDarkCard
            border.color: theme.borderCard
            Layout.preferredHeight: behaviorCol.implicitHeight + 32

            ColumnLayout {
                id: behaviorCol
                anchors.fill: parent
                anchors.margins: 16
                spacing: 16

                RowLayout {
                    spacing: 8
                    AppIcon { width: 16; height: 16; name: "zap"; color: theme.brand400 }
                    Text {
                        text: qsTr("Comportamento e Desempenho")
                        color: theme.textDark
                        font.pixelSize: 14
                        font.bold: true
                    }
                }

                // Toggle: Hardware Acceleration
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 2
                        Text {
                            text: qsTr("Aceleração de Vídeo por Hardware (GPU)")
                            color: theme.textDark
                            font.pixelSize: 13
                            font.bold: true
                        }
                        Text {
                            text: qsTr("Utiliza a GPU dedicada para decodificação suave sem sobrecarregar a CPU.")
                            color: theme.textSubtext
                            font.pixelSize: 11
                        }
                    }

                    Switch {
                        checked: videoTabRoot.hardwareAcceleration
                        onToggled: {
                            videoTabRoot.hardwareAcceleration = checked
                            videoTabRoot.savePreferences()
                            videoTabRoot.settingsChanged()
                        }
                    }
                }

                Rectangle { Layout.fillWidth: true; height: 1; color: theme.borderSubtle }

                // Toggle: Auto-Resume Playback
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 2
                        Text {
                            text: qsTr("Retomar Vídeos Automaticamente")
                            color: theme.textDark
                            font.pixelSize: 13
                            font.bold: true
                        }
                        Text {
                            text: qsTr("Lembra o último segundo assistido ao reabrir qualquer aula ou vídeo.")
                            color: theme.textSubtext
                            font.pixelSize: 11
                        }
                    }

                    Switch {
                        checked: videoTabRoot.autoResumePosition
                        onToggled: {
                            videoTabRoot.autoResumePosition = checked
                            videoTabRoot.savePreferences()
                            videoTabRoot.settingsChanged()
                        }
                    }
                }
            }
        }

        // 3. Subtitles & Typography
        Rectangle {
            Layout.fillWidth: true
            radius: 12
            color: theme.bgDarkCard
            border.color: theme.borderCard
            Layout.preferredHeight: subCol.implicitHeight + 32

            ColumnLayout {
                id: subCol
                anchors.fill: parent
                anchors.margins: 16
                spacing: 14

                RowLayout {
                    spacing: 8
                    AppIcon { width: 16; height: 16; name: "edit"; color: theme.brand400 }
                    Text {
                        text: qsTr("Legendas Interativas e Tipografia")
                        color: theme.textDark
                        font.pixelSize: 14
                        font.bold: true
                    }
                }

                Text {
                    text: qsTr("Tamanho da fonte exibida nas legendas interativas e palavras clicáveis.")
                    color: theme.textSubtext
                    font.pixelSize: 12
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 10

                    Repeater {
                        model: [
                            { id: "small", label: qsTr("Pequeno (14px)") },
                            { id: "medium", label: qsTr("Médio (18px)") },
                            { id: "large", label: qsTr("Grande (22px)") }
                        ]

                        delegate: Rectangle {
                            Layout.fillWidth: true
                            Layout.preferredHeight: 38
                            radius: 8
                            color: videoTabRoot.subtitleSize === modelData.id ? theme.activePillBg : theme.bgDarkSurface
                            border.color: videoTabRoot.subtitleSize === modelData.id ? theme.brand500 : theme.borderSubtle
                            border.width: videoTabRoot.subtitleSize === modelData.id ? 1.5 : 1

                            Text {
                                anchors.centerIn: parent
                                text: modelData.label
                                color: videoTabRoot.subtitleSize === modelData.id ? theme.brand400 : theme.textDark
                                font.pixelSize: 12
                                font.bold: videoTabRoot.subtitleSize === modelData.id
                            }

                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    videoTabRoot.subtitleSize = modelData.id
                                    videoTabRoot.savePreferences()
                                    videoTabRoot.settingsChanged()
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
