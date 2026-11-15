import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: root
    anchors.fill: parent
    color: "#80000000"
    visible: false
    z: 200

    property string word: ""
    property string context: ""
    property string language: "en"
    property bool isSearching: false
    property var definitionData: null
    property string statusMessage: ""

    signal closeRequested()
    signal saveToVocabRequested(string word, string note)
    signal createFlashcardRequested(string front, string back)

    function openForWord(targetWord, contextSentence) {
        word = targetWord.trim()
        context = contextSentence ? contextSentence.trim() : ""
        language = "en"
        statusMessage = ""
        definitionData = null
        visible = true
        fetchDefinition()
    }

    function closeModal() {
        visible = false
        closeRequested()
    }

    function fetchDefinition() {
        if (!word || word.length === 0) return
        isSearching = true
        statusMessage = ""

        lookupTimer.start()
    }

    Timer {
        id: lookupTimer
        interval: 350
        repeat: false
        onTriggered: {
            root.isSearching = false
            // Rich definition mock/structure
            root.definitionData = {
                word: root.word,
                phonetic: "/ " + root.word.toLowerCase() + " /",
                partOfSpeech: "noun / verb",
                meanings: [
                    {
                        definition: "A fundamental concept, action or term used in the current context.",
                        example: root.context.length > 0 ? root.context : "This demonstrates the practical usage of " + root.word + "."
                    },
                    {
                        definition: "Secondary meaning relating to context or domain literature.",
                        example: "An exemplary illustration of the subject matter."
                    }
                ],
                portuguese: "Conceito, termo ou ação fundamental referente ao texto."
            }
        }
    }

    MouseArea {
        anchors.fill: parent
        onClicked: root.closeModal()
    }

    Rectangle {
        id: card
        width: Math.min(parent.width - 32, 520)
        implicitHeight: contentCol.implicitHeight + 36
        anchors.centerIn: parent
        radius: 16
        color: "#161524"
        border.color: "#25ffffff"
        border.width: 1

        MouseArea { anchors.fill: parent }

        ColumnLayout {
            id: contentCol
            anchors.fill: parent
            anchors.margins: 20
            spacing: 16

            // Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Text { text: "📖"; font.pixelSize: 22 }
                ColumnLayout {
                    spacing: 2
                    Text {
                        text: root.word.length > 0 ? root.word : "Dicionário"
                        color: "#fffffe"
                        font.pixelSize: 18
                        font.bold: true
                    }
                    Text {
                        visible: root.definitionData !== null
                        text: root.definitionData ? root.definitionData.phonetic : ""
                        color: "#818cf8"
                        font.pixelSize: 12
                    }
                }

                Item { Layout.fillWidth: true }

                // Language toggle pills
                RowLayout {
                    spacing: 4
                    Rectangle {
                        width: 32; height: 26; radius: 6
                        color: root.language === "en" ? "#6366f1" : "#1e1d2c"
                        Text { anchors.centerIn: parent; text: "EN"; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: { root.language = "en"; root.fetchDefinition() }
                        }
                    }
                    Rectangle {
                        width: 32; height: 26; radius: 6
                        color: root.language === "pt" ? "#6366f1" : "#1e1d2c"
                        Text { anchors.centerIn: parent; text: "PT"; color: "#ffffff"; font.pixelSize: 11; font.bold: true }
                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: { root.language = "pt"; root.fetchDefinition() }
                        }
                    }
                }

                Rectangle {
                    width: 28; height: 28; radius: 6
                    color: "#15ffffff"
                    Text { anchors.centerIn: parent; text: "✕"; color: "#a7a9be"; font.pixelSize: 12 }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.closeModal()
                    }
                }
            }

            Rectangle { Layout.fillWidth: true; height: 1; color: "#10ffffff" }

            // Content
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 12

                BusyIndicator {
                    running: root.isSearching
                    visible: root.isSearching
                    Layout.alignment: Qt.AlignHCenter
                }

                ColumnLayout {
                    visible: !root.isSearching && root.definitionData !== null
                    Layout.fillWidth: true
                    spacing: 12

                    // Part of speech
                    Rectangle {
                        radius: 4
                        color: "#1e1c30"
                        Layout.preferredWidth: posText.contentWidth + 12
                        Layout.preferredHeight: 22
                        Text {
                            id: posText
                            anchors.centerIn: parent
                            text: root.definitionData ? root.definitionData.partOfSpeech : ""
                            color: "#c4b5fd"
                            font.pixelSize: 11
                            font.italic: true
                        }
                    }

                    // Definitions
                    Repeater {
                        model: root.definitionData ? root.definitionData.meanings : []
                        delegate: ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 6
                                Text { text: (index + 1) + "."; color: "#818cf8"; font.pixelSize: 13; font.bold: true }
                                Text {
                                    Layout.fillWidth: true
                                    text: modelData.definition
                                    color: "#e2e8f0"
                                    font.pixelSize: 13
                                    wrapMode: Text.Wrap
                                }
                            }

                            Text {
                                visible: modelData.example && modelData.example.length > 0
                                Layout.fillWidth: true
                                text: "“" + modelData.example + "”"
                                color: "#94a3b8"
                                font.pixelSize: 12
                                font.italic: true
                                wrapMode: Text.Wrap
                            }
                        }
                    }

                    // Portuguese Translation
                    ColumnLayout {
                        visible: root.definitionData && root.definitionData.portuguese
                        Layout.fillWidth: true
                        spacing: 4
                        Text { text: "TRADUÇÃO"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true }
                        Text {
                            text: root.definitionData ? root.definitionData.portuguese : ""
                            color: "#fffffe"
                            font.pixelSize: 13
                            font.bold: true
                        }
                    }
                }
            }

            Rectangle { Layout.fillWidth: true; height: 1; color: "#10ffffff" }

            // Actions Footer
            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                Button {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 38
                    text: "🔖 Salvar Vocabulário"
                    onClicked: {
                        var def = root.definitionData && root.definitionData.meanings && root.definitionData.meanings.length > 0
                            ? root.definitionData.meanings[0].definition
                            : ""
                        root.saveToVocabRequested(root.word, def)
                        root.closeModal()
                    }
                    background: Rectangle { color: parent.hovered ? "#342b58" : "#242335"; radius: 8; border.color: "#30ffffff" }
                    contentItem: Text { text: parent.text; color: "#ddd6fe"; font.pixelSize: 12; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                }

                Button {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 38
                    text: "⚡ Criar Flashcard Anki"
                    onClicked: {
                        var def = root.definitionData && root.definitionData.meanings && root.definitionData.meanings.length > 0
                            ? root.definitionData.meanings[0].definition
                            : ""
                        root.createFlashcardRequested(root.word, def)
                        root.closeModal()
                    }
                    background: Rectangle { color: parent.hovered ? "#4f46e5" : "#6366f1"; radius: 8 }
                    contentItem: Text { text: parent.text; color: "#ffffff"; font.pixelSize: 12; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                }
            }
        }
    }

    Shortcut {
        sequence: "Escape"
        enabled: root.visible
        onActivated: root.closeModal()
    }
}
