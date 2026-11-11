import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Dialog {
    id: statsDialog
    modal: true
    anchors.centerIn: parent
    width: Math.min(parent.width - 32, 760)
    height: Math.min(parent.height - 32, 680)
    padding: 0
    closePolicy: Popup.CloseOnEscape
    standardButtons: Dialog.NoButton

    property bool isOpen: false
    property var stats: ({})
    property var booksInProgress: []

    signal dismissRequested()

    function openFor(readingStats, books) {
        stats = readingStats || ({})
        booksInProgress = books || []
        isOpen = true
    }

    function formatReadingTime(minutes) {
        var total = Math.max(0, Number(minutes) || 0)
        var hours = Math.floor(total / 60)
        var remainingMinutes = Math.floor(total % 60)
        return hours === 0 ? remainingMinutes + "m" : hours + "h " + remainingMinutes + "m"
    }

    function daysForHeatmap() {
        var activeDays = stats.readingDays || []
        var days = []
        var now = new Date()
        for (var offset = 29; offset >= 0; --offset) {
            var day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset))
            var dateText = day.toISOString().slice(0, 10)
            days.push({ date: dateText, active: activeDays.indexOf(dateText) >= 0 })
        }
        return days
    }

    onIsOpenChanged: {
        if (isOpen) open()
        else close()
    }
    onClosed: {
        isOpen = false
        dismissRequested()
    }

    background: Rectangle { color: "#181720"; radius: 16; border.color: "#10ffffff" }

    header: Rectangle {
        implicitHeight: 64
        color: "#08ffffff"
        radius: 16
        Rectangle { anchors.bottom: parent.bottom; width: parent.width; height: 1; color: "#0cffffff" }
        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: 20
            anchors.rightMargin: 12
            spacing: 12
            Rectangle {
                Layout.preferredWidth: 38
                Layout.preferredHeight: 38
                radius: 11
                color: "#1a8b5cf6"
                border.color: "#338b5cf6"
                Text { anchors.centerIn: parent; text: "▥"; color: "#c4b5fd"; font.pixelSize: 20 }
            }
            Label {
                Layout.fillWidth: true
                text: "Estatísticas de leitura"
                color: "#f4f4f5"
                font.pixelSize: 16
                font.bold: true
            }
            ToolButton {
                text: "×"
                Accessible.name: "Fechar estatísticas"
                onClicked: statsDialog.close()
                contentItem: Text { text: parent.text; color: "#a7a9be"; font.pixelSize: 24; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
            }
        }
    }

    contentItem: ScrollView {
        clip: true
        contentWidth: availableWidth

        ColumnLayout {
            anchors.left: parent.left
            anchors.right: parent.right
            anchors.top: parent.top
            anchors.margins: 20
            spacing: 18

            GridLayout {
                Layout.fillWidth: true
                columns: 4
                columnSpacing: 10
                rowSpacing: 10

                Repeater {
                    model: [
                        { label: "Livros concluídos", value: Number(statsDialog.stats.totalBooksFinished) || 0, color: "#34d399" },
                        { label: "Páginas lidas", value: Number(statsDialog.stats.totalPagesRead) || 0, color: "#60a5fa" },
                        { label: "Tempo total", value: statsDialog.formatReadingTime(statsDialog.stats.totalTimeMinutes), color: "#c4b5fd" },
                        { label: "Sequência atual", value: (Number(statsDialog.stats.currentStreak) || 0) + " dias", color: "#fbbf24" }
                    ]
                    delegate: Rectangle {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 78
                        radius: 11
                        color: "#201f2c"
                        border.color: "#10ffffff"
                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 5
                            Text { text: modelData.label; color: "#9293a5"; font.pixelSize: 10; elide: Text.ElideRight }
                            Text { text: modelData.value; color: modelData.color; font.pixelSize: 19; font.bold: true; elide: Text.ElideRight }
                        }
                    }
                }
            }

            Rectangle {
                Layout.fillWidth: true
                Layout.preferredHeight: 112
                radius: 12
                color: "#111018"
                border.color: "#10ffffff"
                ColumnLayout {
                    anchors.fill: parent
                    anchors.margins: 14
                    spacing: 12
                    RowLayout {
                        Layout.fillWidth: true
                        Text { Layout.fillWidth: true; text: "Atividade nos últimos 30 dias"; color: "#f4f4f5"; font.pixelSize: 12; font.bold: true }
                        Text { text: statsDialog.daysForHeatmap().filter(function(day) { return day.active }).length + " dias ativos"; color: "#9293a5"; font.pixelSize: 10 }
                    }
                    GridLayout {
                        Layout.alignment: Qt.AlignHCenter
                        columns: 10
                        columnSpacing: 5
                        rowSpacing: 5
                        Repeater {
                            model: statsDialog.daysForHeatmap()
                            delegate: Rectangle {
                                Layout.preferredWidth: 14
                                Layout.preferredHeight: 14
                                radius: 3
                                color: modelData.active ? "#8b5cf6" : "#292833"
                                border.color: modelData.active ? "#8b5cf6" : "#30ffffff"
                                ToolTip.visible: dayHover.containsMouse
                                ToolTip.text: modelData.date + (modelData.active ? ": Leu" : ": Sem leitura")
                                MouseArea { id: dayHover; anchors.fill: parent; hoverEnabled: true }
                            }
                        }
                    }
                }
            }

            Rectangle {
                Layout.fillWidth: true
                Layout.preferredHeight: Math.max(88, booksColumn.implicitHeight + 28)
                visible: statsDialog.booksInProgress.length > 0
                radius: 12
                color: "#111018"
                border.color: "#10ffffff"
                ColumnLayout {
                    id: booksColumn
                    anchors.fill: parent
                    anchors.margins: 14
                    spacing: 11
                    Text {
                        text: "Lendo atualmente (" + statsDialog.booksInProgress.length + ")"
                        color: "#f4f4f5"
                        font.pixelSize: 12
                        font.bold: true
                    }
                    Repeater {
                        model: statsDialog.booksInProgress
                        delegate: ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 5
                            RowLayout {
                                Layout.fillWidth: true
                                Text { Layout.fillWidth: true; text: modelData.title || "Livro sem título"; color: "#e4e4e7"; font.pixelSize: 11; elide: Text.ElideRight }
                                Text {
                                    readonly property real progress: Number(modelData.total_pages) > 0
                                        ? Math.max(0, Math.min(100, Math.round((Number(modelData.current_page) || 0) * 100 / Number(modelData.total_pages)))) : 0
                                    text: progress + "%"
                                    color: "#a7a9be"
                                    font.pixelSize: 10
                                }
                            }
                            Rectangle {
                                Layout.fillWidth: true
                                Layout.preferredHeight: 5
                                radius: 3
                                color: "#292833"
                                Rectangle {
                                    width: parent.width * (Number(modelData.total_pages) > 0
                                        ? Math.max(0, Math.min(1, (Number(modelData.current_page) || 0) / Number(modelData.total_pages))) : 0)
                                    height: parent.height
                                    radius: 3
                                    color: "#8b5cf6"
                                }
                            }
                        }
                    }
                }
            }

            GridLayout {
                Layout.fillWidth: true
                columns: 2
                columnSpacing: 10
                rowSpacing: 10
                Repeater {
                    model: [
                        { label: "Total de destaques", value: Number(statsDialog.stats.totalHighlights) || 0, color: "#f472b6" },
                        { label: "Livros iniciados", value: Number(statsDialog.stats.totalBooksStarted) || 0, color: "#22d3ee" }
                    ]
                    delegate: Rectangle {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 64
                        radius: 11
                        color: "#201f2c"
                        border.color: "#10ffffff"
                        RowLayout {
                            anchors.fill: parent
                            anchors.margins: 14
                            spacing: 12
                            Text { text: "◆"; color: modelData.color; font.pixelSize: 18 }
                            ColumnLayout {
                                spacing: 2
                                Text { text: modelData.label; color: "#9293a5"; font.pixelSize: 10 }
                                Text { text: modelData.value; color: "#f4f4f5"; font.pixelSize: 16; font.bold: true }
                            }
                        }
                    }
                }
            }
        }
    }
}
