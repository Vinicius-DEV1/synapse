import QtQuick 2.15
import QtQuick.Layouts 1.15

Item {
    id: subRoot
    anchors.fill: parent

    property string subtitleText: ""
    property var bookmarks: []
    property bool controlsVisible: true
    property real bottomMargin: controlsVisible ? 96 : 32

    signal wordClicked(string word, string context)

    function isWordSaved(word) {
        if (!bookmarks || !word) return false
        var clean = word.toLowerCase().trim()
        for (var i = 0; i < bookmarks.length; i++) {
            var bWord = String(bookmarks[i].word || "").toLowerCase().trim()
            if (bWord === clean) return true
        }
        return false
    }

    function parseSubtitleLines(text) {
        if (!text || text.trim().length === 0) return []
        var rawLines = text.split(/\r?\n/)
        var regex = /([a-zA-Z0-9_\u00C0-\u017F]+(?:'[a-zA-Z0-9_\u00C0-\u017F]+)?)|([^a-zA-Z0-9_\u00C0-\u017F]+)/g
        var result = []
        for (var l = 0; l < rawLines.length; l++) {
            var line = rawLines[l].trim()
            if (!line) continue
            var tokens = []
            var match
            regex.lastIndex = 0
            while ((match = regex.exec(line)) !== null) {
                if (match[1]) {
                    tokens.push({
                        text: match[1],
                        isWord: true,
                        isSaved: isWordSaved(match[1])
                    })
                } else if (match[2]) {
                    tokens.push({
                        text: match[2],
                        isWord: false,
                        isSaved: false
                    })
                }
            }
            if (tokens.length > 0) result.push(tokens)
        }
        return result
    }

    Rectangle {
        id: subtitleBubble
        anchors.bottom: parent.bottom
        anchors.bottomMargin: subRoot.bottomMargin
        anchors.horizontalCenter: parent.horizontalCenter
        visible: subRoot.subtitleText.trim().length > 0
        width: Math.min(parent.width - 48, contentCol.implicitWidth + 32)
        height: contentCol.implicitHeight + 16
        radius: 12
        color: "#d9000000"
        border.color: "#33ffffff"
        border.width: 1

        Behavior on anchors.bottomMargin {
            NumberAnimation { duration: 220; easing.type: Easing.OutCubic }
        }

        Column {
            id: contentCol
            anchors.centerIn: parent
            spacing: 4

            Repeater {
                model: subRoot.parseSubtitleLines(subRoot.subtitleText)

                Flow {
                    anchors.horizontalCenter: parent ? parent.horizontalCenter : undefined
                    spacing: 0

                    Repeater {
                        model: modelData

                        Item {
                            implicitWidth: modelData.isWord ? (wordTxt.implicitWidth + 6) : rawTxt.implicitWidth
                            implicitHeight: modelData.isWord ? (wordTxt.implicitHeight + 4) : rawTxt.implicitHeight

                            Rectangle {
                                visible: modelData.isWord
                                anchors.fill: parent
                                radius: 4
                                color: modelData.isSaved ? "#59eab308" : (wordMa.containsMouse ? "#665b21b6" : "transparent")
                                border.color: modelData.isSaved ? "#80facc15" : (wordMa.containsMouse ? "#9333ea" : "transparent")
                                border.width: 1

                                Text {
                                    id: wordTxt
                                    anchors.centerIn: parent
                                    text: modelData.text
                                    color: modelData.isSaved ? "#fef08a" : (wordMa.containsMouse ? "#f5f3ff" : "#ffffff")
                                    font.pixelSize: 20
                                    font.bold: modelData.isSaved
                                    font.weight: Font.Medium
                                }

                                MouseArea {
                                    id: wordMa
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: {
                                        subRoot.wordClicked(modelData.text, subRoot.subtitleText)
                                    }
                                }
                            }

                            Text {
                                id: rawTxt
                                visible: !modelData.isWord
                                anchors.centerIn: parent
                                text: modelData.text
                                color: "#ffffff"
                                font.pixelSize: 20
                                font.weight: Font.Medium
                            }
                        }
                    }
                }
            }
        }
    }
}
