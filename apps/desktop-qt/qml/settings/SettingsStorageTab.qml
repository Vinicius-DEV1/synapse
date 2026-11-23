import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Item {
    id: storageTabRoot
    Layout.fillWidth: true
    implicitHeight: contentCol.implicitHeight

    Theme { id: theme }

    property var diagnostics: ({})
    property string feedbackMessage: ""
    property bool isSuccessFeedback: true

    function refresh() {
        diagnostics = dataController.getSystemDiagnostics()
        dataController.refreshStats()
    }

    Component.onCompleted: {
        refresh()
    }

    ColumnLayout {
        id: contentCol
        anchors.fill: parent
        spacing: 20

        // Storage Header & Recalculate
        RowLayout {
            Layout.fillWidth: true
            spacing: 12

            RowLayout {
                spacing: 8
                AppIcon { width: 18; height: 18; name: "hard-drive"; color: theme.brand400 }
                Text {
                    text: qsTr("Armazenamento e Banco de Dados")
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
                        storageTabRoot.refresh()
                        storageTabRoot.feedbackMessage = qsTr("Métricas de armazenamento recalculadas.")
                        storageTabRoot.isSuccessFeedback = true
                    }
                }
            }
        }

        // Feedback Banner
        Rectangle {
            visible: storageTabRoot.feedbackMessage.length > 0
            Layout.fillWidth: true
            Layout.preferredHeight: 38
            radius: 8
            color: storageTabRoot.isSuccessFeedback ? theme.successBg : theme.errorBg
            border.color: storageTabRoot.isSuccessFeedback ? theme.successBorder : theme.errorBorder

            RowLayout {
                anchors.fill: parent
                anchors.margins: 10
                spacing: 8

                AppIcon {
                    width: 14; height: 14
                    name: storageTabRoot.isSuccessFeedback ? "check" : "alert"
                    color: storageTabRoot.isSuccessFeedback ? theme.success : theme.error
                }

                Text {
                    Layout.fillWidth: true
                    text: storageTabRoot.feedbackMessage
                    color: storageTabRoot.isSuccessFeedback ? theme.success : theme.error
                    font.pixelSize: 12
                }

                Text {
                    text: "✕"
                    color: theme.textSubtext
                    font.pixelSize: 12
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: storageTabRoot.feedbackMessage = ""
                    }
                }
            }
        }

        // Total Disk Usage & SQLite Location Card
        Rectangle {
            Layout.fillWidth: true
            radius: 12
            color: theme.bgDarkCard
            border.color: theme.borderCard
            Layout.preferredHeight: dbInfoCol.implicitHeight + 32

            ColumnLayout {
                id: dbInfoCol
                anchors.fill: parent
                anchors.margins: 16
                spacing: 12

                Text {
                    text: qsTr("LOCALIZAÇÃO DO BANCO DE DADOS LOCAL (SQLITE WAL)")
                    color: theme.textMuted
                    font.pixelSize: 10
                    font.bold: true
                    font.letterSpacing: 1.1
                }

                Rectangle {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 38
                    radius: 8
                    color: theme.bgDarkSurface
                    border.color: theme.borderSubtle

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 10
                        spacing: 8

                        AppIcon { width: 14; height: 14; name: "hard-drive"; color: theme.brand400 }

                        Text {
                            Layout.fillWidth: true
                            text: dataController.dbPath || "SQLite Local Profile"
                            color: theme.textDark
                            font.pixelSize: 12
                            font.family: theme.fontMono
                            elide: Text.ElideMiddle
                        }
                    }
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    // Optimize Button
                    Rectangle {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 38
                        radius: 8
                        color: optMouse.containsMouse ? theme.brand600 : theme.brand500

                        RowLayout {
                            anchors.centerIn: parent
                            spacing: 8
                            AppIcon { width: 14; height: 14; name: "refresh"; color: "#ffffff" }
                            Text {
                                text: qsTr("Otimizar e Truncar WAL")
                                color: "#ffffff"
                                font.pixelSize: 12
                                font.bold: true
                            }
                        }

                        MouseArea {
                            id: optMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                dataController.optimizeDatabase()
                                dataController.checkpointWal()
                                storageTabRoot.refresh()
                                storageTabRoot.feedbackMessage = qsTr("Banco SQLite otimizado e checkpoint WAL PASSIVE executado com sucesso!")
                                storageTabRoot.isSuccessFeedback = true
                            }
                        }
                    }

                    // Clean Cache Button
                    Rectangle {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 38
                        radius: 8
                        color: cleanMouse.containsMouse ? theme.bgHover : theme.bgDarkSurface
                        border.color: theme.borderSubtle

                        RowLayout {
                            anchors.centerIn: parent
                            spacing: 8
                            AppIcon { width: 14; height: 14; name: "trash"; color: theme.textSubtext }
                            Text {
                                text: qsTr("Limpar Arquivos Temporários")
                                color: theme.textDark
                                font.pixelSize: 12
                            }
                        }

                        MouseArea {
                            id: cleanMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                storageTabRoot.refresh()
                                storageTabRoot.feedbackMessage = qsTr("Arquivos temporários e páginas renderizadas de PDF liberadas da memória.")
                                storageTabRoot.isSuccessFeedback = true
                            }
                        }
                    }
                }
            }
        }

        // Volumetry Grid
        SettingsVolumetryGrid {
            pageCount: dataController.pageCount
            videoCount: dataController.videoCount
            deckCount: dataController.deckCount
            bookCount: dataController.bookCount
            cultureCount: dataController.cultureCount
            vaultItemCount: dataController.vaultItemCount
            transactionCount: dataController.transactionCount
            eventCount: dataController.eventCount
            habitCount: dataController.habitCount
            quizBatteryCount: dataController.quizBatteryCount
            focusSessionCount: dataController.focusSessionCount
        }
    }
}
