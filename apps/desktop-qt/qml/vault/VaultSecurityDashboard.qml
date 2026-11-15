import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Item {
    id: secDashboardRoot
    property var analysis: ({})
    property bool isAnalyzing: false
    property int progress: 0
    signal editItemRequested(var item)

    function runAnalysis() {
        if (isAnalyzing) return
        isAnalyzing = true
        progress = 10
        analysisTimer.restart()
    }

    Timer {
        id: analysisTimer
        interval: 300
        onTriggered: {
            secDashboardRoot.progress = 60
            completeTimer.restart()
        }
    }

    Timer {
        id: completeTimer
        interval: 300
        onTriggered: {
            secDashboardRoot.progress = 100
            secDashboardRoot.analysis = dataController.getVaultSecurityAnalysis()
            secDashboardRoot.isAnalyzing = false
        }
    }

    Component.onCompleted: runAnalysis()

    ScrollView {
        anchors.fill: parent
        contentWidth: parent.width
        clip: true

        ColumnLayout {
            width: Math.min(parent.width - 64, 960)
            anchors.horizontalCenter: parent.horizontalCenter
            spacing: 24

            Item { Layout.preferredHeight: 16 }

            // Header Row
            RowLayout {
                Layout.fillWidth: true

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4

                    RowLayout {
                        spacing: 8
                        AppIcon {
                            name: "shield"
                            color: "#7c3aed"
                            Layout.preferredWidth: 28
                            Layout.preferredHeight: 28
                        }
                        Text {
                            text: "Painel de Segurança"
                            color: "#fffffe"
                            font.pixelSize: 24
                            font.weight: Font.Bold
                        }
                    }

                    Text {
                        text: "Analise a integridade de todas as suas senhas do cofre."
                        color: "#a7a9be"
                        font.pixelSize: 13
                    }
                }

                Rectangle {
                    Layout.preferredWidth: 160
                    Layout.preferredHeight: 38
                    radius: 10
                    color: secDashboardRoot.isAnalyzing ? "#3b1e54" : (reRunMouse.containsMouse ? "#6d28d9" : "#7c3aed")

                    RowLayout {
                        anchors.centerIn: parent
                        spacing: 6

                        AppIcon {
                            name: secDashboardRoot.isAnalyzing ? "loader" : "refresh"
                            color: "#ffffff"
                            Layout.preferredWidth: 14
                            Layout.preferredHeight: 14
                        }

                        Text {
                            text: secDashboardRoot.isAnalyzing ? "Analisando..." : "Analisar Novamente"
                            color: "#ffffff"
                            font.pixelSize: 12
                            font.weight: Font.DemiBold
                        }
                    }

                    MouseArea {
                        id: reRunMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: secDashboardRoot.runAnalysis()
                    }
                }
            }

            // Progress Banner
            Rectangle {
                visible: secDashboardRoot.isAnalyzing
                Layout.fillWidth: true
                Layout.preferredHeight: 70
                radius: 16
                color: "#16161e"
                border.color: "#7c3aed"
                border.width: 1

                ColumnLayout {
                    anchors.centerIn: parent
                    width: parent.width - 48
                    spacing: 8

                    Text {
                        text: "Verificando integridade das credenciais... (" + secDashboardRoot.progress + "%)"
                        color: "#fffffe"
                        font.pixelSize: 12
                        horizontalAlignment: Text.AlignHCenter
                        Layout.fillWidth: true
                    }

                    Rectangle {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 6
                        radius: 3
                        color: "#0f0e17"

                        Rectangle {
                            height: parent.height
                            width: parent.width * (secDashboardRoot.progress / 100.0)
                            radius: 3
                            color: "#7c3aed"
                        }
                    }
                }
            }

            // Health Score Hero Card
            Rectangle {
                Layout.fillWidth: true
                Layout.preferredHeight: 140
                radius: 20
                color: "#16161e"
                border.color: "#2e2e38"
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 24
                    spacing: 24

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 4

                        Text {
                            text: "SAÚDE DO COFRE"
                            color: "#a7a9be"
                            font.pixelSize: 11
                            font.weight: Font.Bold
                        }

                        RowLayout {
                            spacing: 4
                            Text {
                                readonly property int s: secDashboardRoot.analysis ? (secDashboardRoot.analysis.score !== undefined ? secDashboardRoot.analysis.score : 100) : 100
                                text: "" + s
                                color: s >= 90 ? "#10b981" : (s >= 70 ? "#eab308" : "#ef4444")
                                font.pixelSize: 44
                                font.weight: Font.Bold
                            }
                            Text {
                                text: "/100"
                                color: "#6b7280"
                                font.pixelSize: 18
                                Layout.alignment: Qt.AlignBottom
                                Layout.bottomMargin: 8
                            }
                        }

                        Text {
                            readonly property int s: secDashboardRoot.analysis ? (secDashboardRoot.analysis.score !== undefined ? secDashboardRoot.analysis.score : 100) : 100
                            text: s === 100 ? "Excelente! Seu cofre está impenetrável." : (s >= 70 ? "Muito bom, mas pode melhorar alguns detalhes." : "Atenção! Você possui vulnerabilidades críticas.")
                            color: s >= 90 ? "#34d399" : (s >= 70 ? "#facc15" : "#f87171")
                            font.pixelSize: 12
                        }
                    }

                    // Stat tiles
                    RowLayout {
                        spacing: 12

                        Rectangle {
                            Layout.preferredWidth: 90
                            Layout.preferredHeight: 80
                            radius: 12
                            color: "#0f0e17"
                            border.color: "#22222d"
                            border.width: 1

                            ColumnLayout {
                                anchors.centerIn: parent
                                spacing: 2
                                Text {
                                    text: "" + ((secDashboardRoot.analysis && secDashboardRoot.analysis.weakItems) ? secDashboardRoot.analysis.weakItems.length : 0)
                                    color: "#eab308"
                                    font.pixelSize: 22
                                    font.weight: Font.Bold
                                    Layout.alignment: Qt.AlignHCenter
                                }
                                Text {
                                    text: "Fracas"
                                    color: "#a7a9be"
                                    font.pixelSize: 10
                                    Layout.alignment: Qt.AlignHCenter
                                }
                            }
                        }

                        Rectangle {
                            Layout.preferredWidth: 90
                            Layout.preferredHeight: 80
                            radius: 12
                            color: "#0f0e17"
                            border.color: "#22222d"
                            border.width: 1

                            ColumnLayout {
                                anchors.centerIn: parent
                                spacing: 2
                                Text {
                                    text: "" + ((secDashboardRoot.analysis && secDashboardRoot.analysis.reusedItems) ? secDashboardRoot.analysis.reusedItems.length : 0)
                                    color: "#f97316"
                                    font.pixelSize: 22
                                    font.weight: Font.Bold
                                    Layout.alignment: Qt.AlignHCenter
                                }
                                Text {
                                    text: "Reutilizadas"
                                    color: "#a7a9be"
                                    font.pixelSize: 10
                                    Layout.alignment: Qt.AlignHCenter
                                }
                            }
                        }

                        Rectangle {
                            Layout.preferredWidth: 90
                            Layout.preferredHeight: 80
                            radius: 12
                            color: "#0f0e17"
                            border.color: "#22222d"
                            border.width: 1

                            ColumnLayout {
                                anchors.centerIn: parent
                                spacing: 2
                                Text {
                                    text: "" + ((secDashboardRoot.analysis && secDashboardRoot.analysis.googleItems) ? secDashboardRoot.analysis.googleItems.length : 0)
                                    color: "#7c3aed"
                                    font.pixelSize: 22
                                    font.weight: Font.Bold
                                    Layout.alignment: Qt.AlignHCenter
                                }
                                Text {
                                    text: "Google SSO"
                                    color: "#a7a9be"
                                    font.pixelSize: 10
                                    Layout.alignment: Qt.AlignHCenter
                                }
                            }
                        }
                    }
                }
            }

            // Cards Grid
            RowLayout {
                Layout.fillWidth: true
                Layout.preferredHeight: 320
                spacing: 16

                VaultSecurityCategoryCard {
                    title: "Fracas"
                    iconName: "alert"
                    iconColor: "#eab308"
                    iconBgColor: "#292318"
                    description: "Senhas curtas ou sem variação de caracteres."
                    emptyMessage: "Nenhuma senha fraca!"
                    items: secDashboardRoot.analysis ? secDashboardRoot.analysis.weakItems : []
                    count: items ? items.length : 0
                    onItemClicked: function(item) { secDashboardRoot.editItemRequested(item) }
                }

                VaultSecurityCategoryCard {
                    title: "Reutilizadas"
                    iconName: "refresh"
                    iconColor: "#f97316"
                    iconBgColor: "#2c1d18"
                    description: "Usar a mesma senha em vários serviços é perigoso."
                    emptyMessage: "Nenhuma senha repetida!"
                    items: secDashboardRoot.analysis ? secDashboardRoot.analysis.reusedItems : []
                    count: items ? items.length : 0
                    onItemClicked: function(item) { secDashboardRoot.editItemRequested(item) }
                }

                VaultSecurityCategoryCard {
                    title: "Vazadas"
                    iconName: "alert"
                    iconColor: "#ef4444"
                    iconBgColor: "#2a151b"
                    description: "Senhas expostas em vazamentos públicos de dados."
                    emptyMessage: "Nenhuma senha vazada!"
                    items: secDashboardRoot.analysis ? secDashboardRoot.analysis.breachedItems : []
                    count: items ? items.length : 0
                    onItemClicked: function(item) { secDashboardRoot.editItemRequested(item) }
                }
            }

            Item { Layout.preferredHeight: 32 }
        }
    }
}
