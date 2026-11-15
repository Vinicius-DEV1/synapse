import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: vocabRoot
    anchors.top: parent.top
    anchors.bottom: parent.bottom
    anchors.right: parent.right
    width: 360
    color: "#161524"
    border.color: "#15ffffff"
    border.width: 1
    z: 50

    property var videoWords: []
    property double currentPos: 0
    property string searchQuery: ""

    signal closeRequested()
    signal jumpRequested(double timestamp)
    signal wordDeleted(string wordId)
    signal dictLookupRequested(string word, string context)

    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return "00:00"
        var mins = Math.floor(seconds / 60)
        var secs = Math.floor(seconds % 60)
        var hrs = Math.floor(mins / 60)
        mins = mins % 60
        if (hrs > 0) {
            return hrs + ":" + (mins < 10 ? "0" : "") + mins + ":" + (secs < 10 ? "0" : "") + secs
        }
        return (mins < 10 ? "0" : "") + mins + ":" + (secs < 10 ? "0" : "") + secs
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 16
        spacing: 14

        // Header
        RowLayout {
            Layout.fillWidth: true
            spacing: 10

            Text { text: "📖"; font.pixelSize: 20 }
            ColumnLayout {
                spacing: 2
                Text {
                    text: "Vocabulário Salvo"
                    color: "#fffffe"
                    font.pixelSize: 15
                    font.bold: true
                }
                Text {
                    text: vocabRoot.videoWords.length + " termo(s) cadastrado(s)"
                    color: "#94a3b8"
                    font.pixelSize: 11
                }
            }

            Item { Layout.fillWidth: true }

            Rectangle {
                width: 28; height: 28; radius: 6
                color: "#15ffffff"
                Text { anchors.centerIn: parent; text: "✕"; color: "#a7a9be"; font.pixelSize: 12 }
                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: vocabRoot.closeRequested()
                }
            }
        }

        // Search filter
        TextField {
            id: searchField
            Layout.fillWidth: true
            Layout.preferredHeight: 34
            placeholderText: "Buscar palavra salva…"
            color: "#fffffe"
            font.pixelSize: 12
            placeholderTextColor: "#64748b"
            text: vocabRoot.searchQuery
            onTextChanged: vocabRoot.searchQuery = text

            background: Rectangle {
                color: "#1a1928"
                radius: 8
                border.color: searchField.activeFocus ? "#818cf8" : "#1fffffff"
            }
        }

        // List
        ListView {
            id: wordsList
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            spacing: 8

            model: {
                var list = []
                var q = vocabRoot.searchQuery.toLowerCase().trim()
                for (var i = 0; i < vocabRoot.videoWords.length; ++i) {
                    var w = vocabRoot.videoWords[i]
                    var wordText = (w.word || "").toLowerCase()
                    var ctxText = (w.context || "").toLowerCase()
                    if (q.length === 0 || wordText.indexOf(q) !== -1 || ctxText.indexOf(q) !== -1) {
                        list.push(w)
                    }
                }
                return list
            }

            delegate: Rectangle {
                width: wordsList.width
                height: itemCol.implicitHeight + 16
                radius: 10
                color: "#1a1928"
                border.color: "#12ffffff"
                border.width: 1

                ColumnLayout {
                    id: itemCol
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 6

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8

                        Rectangle {
                            width: 10
                            height: 10
                            radius: 5
                            color: {
                                var c = modelData.color || "yellow"
                                if (c === "green") return "#4ade80"
                                if (c === "blue") return "#60a5fa"
                                if (c === "purple") return "#c084fc"
                                if (c === "pink") return "#f472b6"
                                if (c === "red") return "#f87171"
                                return "#facc15"
                            }
                        }

                        Text {
                            Layout.fillWidth: true
                            text: modelData.word || ""
                            color: "#fffffe"
                            font.pixelSize: 14
                            font.bold: true
                            elide: Text.ElideRight
                        }

                        // Seek to timestamp pill
                        Rectangle {
                            height: 22
                            width: pillText.contentWidth + 12
                            radius: 4
                            color: "#256366f1"
                            border.color: "#55818cf8"

                            Text {
                                id: pillText
                                anchors.centerIn: parent
                                text: vocabRoot.formatTime(modelData.timestamp)
                                color: "#818cf8"
                                font.pixelSize: 11
                                font.bold: true
                            }

                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: vocabRoot.jumpRequested(modelData.timestamp)
                            }
                        }

                        // Dictionary inspect button
                        Rectangle {
                            width: 24; height: 22; radius: 4
                            color: "#2038bdf8"
                            Text { anchors.centerIn: parent; text: "📖"; font.pixelSize: 11 }
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: vocabRoot.dictLookupRequested(modelData.word, modelData.context || "")
                            }
                        }

                        // Delete button
                        Rectangle {
                            width: 22; height: 22; radius: 4
                            color: "#20ef4444"
                            Text { anchors.centerIn: parent; text: "🗑"; color: "#f87171"; font.pixelSize: 11 }
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: vocabRoot.wordDeleted(modelData.id)
                            }
                        }
                    }

                    // Context sentence
                    Text {
                        visible: modelData.context && modelData.context.length > 0
                        Layout.fillWidth: true
                        text: "“" + (modelData.context || "") + "”"
                        color: "#94a3b8"
                        font.pixelSize: 12
                        font.italic: true
                        wrapMode: Text.Wrap
                        maximumLineCount: 3
                        elide: Text.ElideRight
                    }

                    // Note / Definition preview
                    Text {
                        visible: modelData.note && modelData.note.length > 0
                        Layout.fillWidth: true
                        text: modelData.note || ""
                        color: "#c4b5fd"
                        font.pixelSize: 11
                        wrapMode: Text.Wrap
                        maximumLineCount: 2
                        elide: Text.ElideRight
                    }
                }
            }

            // Empty state
            ColumnLayout {
                anchors.centerIn: parent
                visible: wordsList.count === 0
                spacing: 8
                Text {
                    Layout.alignment: Qt.AlignHCenter
                    text: "📚"
                    font.pixelSize: 36
                    opacity: 0.5
                }
                Text {
                    Layout.alignment: Qt.AlignHCenter
                    text: vocabRoot.videoWords.length === 0
                          ? "Nenhuma palavra salva neste vídeo."
                          : "Nenhum resultado encontrado."
                    color: "#64748b"
                    font.pixelSize: 13
                }
                Text {
                    Layout.alignment: Qt.AlignHCenter
                    visible: vocabRoot.videoWords.length === 0
                    text: "Clique nas palavras das legendas para salvá-las!"
                    color: "#475569"
                    font.pixelSize: 11
                }
            }
        }
    }
}
