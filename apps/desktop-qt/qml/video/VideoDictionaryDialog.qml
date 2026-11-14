import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: dictRoot
    anchors.fill: parent
    visible: false
    z: 100

    property string targetWord: ""
    property string sceneContext: ""
    property double videoTimestamp: 0
    property bool isSaved: false
    property string activeColor: "yellow"
    property string languageTab: "en" // "en" or "pt"
    property bool isLoading: false
    property string phoneticText: ""
    property string partOfSpeech: ""
    property var definitions: []
    property var synonyms: []

    signal closed()
    signal bookmarkSaved(string word, string note, string color)

    function openForWord(word, context, timestamp, saved) {
        targetWord = word ? word.trim() : ""
        sceneContext = context ? context.trim() : ""
        videoTimestamp = timestamp || 0
        isSaved = saved === true
        languageTab = "en"
        visible = true
        fetchDefinition(targetWord)
    }

    function closeDialog() {
        visible = false
        closed()
    }

    function highlightWordInContext(ctx, word) {
        if (!ctx || !word) return ctx || ""
        var escapedWord = word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
        var regex = new RegExp("(" + escapedWord + ")", "gi")
        return ctx.replace(regex, "<font color='#facc15'><b>$1</b></font>")
    }

    function fetchDefinition(word) {
        isLoading = true
        definitions = []
        synonyms = []
        phoneticText = ""
        partOfSpeech = ""

        var clean = word.toLowerCase().replace(/[^a-zA-Z0-9_\u00C0-\u017F'-]/g, "").trim()
        if (!clean) {
            isLoading = false
            definitions = ["Palavra ou símbolo pontual selecionado."]
            return
        }

        var xhr = new XMLHttpRequest()
        xhr.open("GET", "https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(clean))
        xhr.timeout = 4000
        xhr.onreadystatechange = function() {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                isLoading = false
                if (xhr.status === 200) {
                    try {
                        var data = JSON.parse(xhr.responseText)
                        if (Array.isArray(data) && data.length > 0) {
                            var entry = data[0]
                            phoneticText = entry.phonetic || (entry.phonetics && entry.phonetics.length > 0 ? (entry.phonetics[0].text || "") : "")

                            var defs = []
                            var syns = []
                            if (Array.isArray(entry.meanings)) {
                                for (var m = 0; m < entry.meanings.length; m++) {
                                    var meaning = entry.meanings[m]
                                    if (!partOfSpeech && meaning.partOfSpeech) {
                                        partOfSpeech = meaning.partOfSpeech
                                    }
                                    if (Array.isArray(meaning.definitions)) {
                                        for (var d = 0; d < meaning.definitions.length && defs.length < 4; d++) {
                                            var defObj = meaning.definitions[d]
                                            if (defObj.definition) {
                                                defs.push(defObj.definition)
                                            }
                                        }
                                    }
                                    if (Array.isArray(meaning.synonyms)) {
                                        for (var s = 0; s < meaning.synonyms.length && syns.length < 6; s++) {
                                            syns.push(meaning.synonyms[s])
                                        }
                                    }
                                }
                            }
                            definitions = defs.length > 0 ? defs : ["No definitions found for this term."]
                            synonyms = syns
                            return
                        }
                    } catch (e) {
                        console.log("[VideoDictionaryDialog] JSON parse error:", e)
                    }
                }
                // Fallback for offline or non-English or API 404
                phoneticText = "/" + clean + "/"
                partOfSpeech = "expressão"
                definitions = [
                    "Termo registrado no diálogo do vídeo.",
                    "Utilizado no contexto: \"" + (sceneContext ? sceneContext.replace(/\r?\n/g, " ") : clean) + "\"."
                ]
            }
        }
        xhr.ontimeout = function() {
            isLoading = false
            phoneticText = "/" + clean + "/"
            partOfSpeech = "expressão"
            definitions = [
                "Definição local para o diálogo em cena.",
                "Utilizado no contexto: \"" + (sceneContext ? sceneContext.replace(/\r?\n/g, " ") : clean) + "\"."
            ]
        }
        xhr.onerror = function() {
            isLoading = false
            phoneticText = "/" + clean + "/"
            partOfSpeech = "expressão"
            definitions = [
                "Definição local para o diálogo em cena.",
                "Utilizado no contexto: \"" + (sceneContext ? sceneContext.replace(/\r?\n/g, " ") : clean) + "\"."
            ]
        }
        xhr.send()
    }

    // Backdrop overlay
    Rectangle {
        anchors.fill: parent
        color: "#b3000000"

        MouseArea {
            anchors.fill: parent
            onClicked: dictRoot.closeDialog()
        }
    }

    Shortcut {
        sequence: "Esc"
        enabled: dictRoot.visible
        onActivated: dictRoot.closeDialog()
    }

    // Main Modal Card
    Rectangle {
        id: card
        anchors.centerIn: parent
        width: Math.min(parent.width - 48, 540)
        height: Math.min(parent.height - 64, 520)
        radius: 16
        color: "#181726"
        border.color: "#33ffffff"
        border.width: 1

        MouseArea {
            anchors.fill: parent
            onClicked: {} // Prevent click-through
        }

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 20
            spacing: 16

            // Header Row: Word, Phonetic, POS, Language Switcher, Close Button
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4

                    RowLayout {
                        spacing: 8
                        Text {
                            text: dictRoot.targetWord
                            color: "#ffffff"
                            font.pixelSize: 22
                            font.bold: true
                        }

                        Rectangle {
                            visible: dictRoot.partOfSpeech.length > 0
                            radius: 4
                            color: "#338b5cf6"
                            border.color: "#80a78bfa"
                            border.width: 1
                            implicitWidth: posTxt.implicitWidth + 8
                            implicitHeight: posTxt.implicitHeight + 4
                            Text {
                                id: posTxt
                                anchors.centerIn: parent
                                text: dictRoot.partOfSpeech
                                color: "#c4b5fd"
                                font.pixelSize: 11
                                font.bold: true
                            }
                        }
                    }

                    Text {
                        visible: dictRoot.phoneticText.length > 0
                        text: dictRoot.phoneticText
                        color: "#a78bfa"
                        font.pixelSize: 13
                        font.family: "Monospace"
                    }
                }

                // Language Toggle Pill (EN / PT)
                Rectangle {
                    implicitWidth: 84
                    implicitHeight: 28
                    radius: 14
                    color: "#12111d"
                    border.color: "#2e2b44"
                    border.width: 1

                    Row {
                        anchors.fill: parent
                        Repeater {
                            model: ["en", "pt"]
                            Rectangle {
                                width: 42
                                height: 28
                                radius: 14
                                color: dictRoot.languageTab === modelData ? "#6366f1" : "transparent"
                                Text {
                                    anchors.centerIn: parent
                                    text: modelData.toUpperCase()
                                    color: dictRoot.languageTab === modelData ? "#ffffff" : "#71717a"
                                    font.pixelSize: 11
                                    font.bold: true
                                }
                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: dictRoot.languageTab = modelData
                                }
                            }
                        }
                    }
                }

                // Close Button
                Rectangle {
                    implicitWidth: 28
                    implicitHeight: 28
                    radius: 14
                    color: closeMa.containsMouse ? "#33ffffff" : "#1a192e"
                    Text {
                        anchors.centerIn: parent
                        text: "✕"
                        color: "#a1a1aa"
                        font.pixelSize: 12
                    }
                    MouseArea {
                        id: closeMa
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: dictRoot.closeDialog()
                    }
                }
            }

            // Scene Context Box
            Rectangle {
                Layout.fillWidth: true
                radius: 10
                color: "#100f1a"
                border.color: "#28263c"
                border.width: 1
                implicitHeight: ctxCol.implicitHeight + 16

                ColumnLayout {
                    id: ctxCol
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 4

                    Text {
                        text: "🎬 CONTEXTO DA CENA"
                        color: "#a78bfa"
                        font.pixelSize: 10
                        font.bold: true
                        font.letterSpacing: 0.5
                    }

                    Text {
                        Layout.fillWidth: true
                        text: dictRoot.highlightWordInContext(dictRoot.sceneContext, dictRoot.targetWord)
                        textFormat: Text.RichText
                        color: "#e4e4e7"
                        font.pixelSize: 13
                        font.italic: true
                        wrapMode: Text.Wrap
                        lineHeight: 1.2
                    }
                }
            }

            // Definitions & Content Area (Scrollable)
            ScrollView {
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true

                ColumnLayout {
                    width: parent.width
                    spacing: 14

                    // Loading State
                    Item {
                        visible: dictRoot.isLoading
                        Layout.fillWidth: true
                        implicitHeight: 60
                        Text {
                            anchors.centerIn: parent
                            text: "Buscando definições no léxico..."
                            color: "#a78bfa"
                            font.pixelSize: 13
                        }
                    }

                    // Content when loaded
                    ColumnLayout {
                        visible: !dictRoot.isLoading
                        Layout.fillWidth: true
                        spacing: 12

                        Text {
                            text: dictRoot.languageTab === "en" ? "DEFINITIONS" : "DEFINIÇÕES & TRADUÇÃO"
                            color: "#a78bfa"
                            font.pixelSize: 10
                            font.bold: true
                            font.letterSpacing: 0.5
                        }

                        Repeater {
                            model: dictRoot.definitions
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8
                                Text {
                                    text: (index + 1) + "."
                                    color: "#6366f1"
                                    font.bold: true
                                    font.pixelSize: 13
                                    Layout.alignment: Qt.AlignTop
                                }
                                Text {
                                    Layout.fillWidth: true
                                    text: modelData
                                    color: "#e4e4e7"
                                    font.pixelSize: 13
                                    wrapMode: Text.Wrap
                                    lineHeight: 1.25
                                }
                            }
                        }

                        // Synonyms
                        ColumnLayout {
                            visible: dictRoot.synonyms && dictRoot.synonyms.length > 0
                            Layout.fillWidth: true
                            spacing: 6

                            Text {
                                text: "SINÔNIMOS"
                                color: "#a78bfa"
                                font.pixelSize: 10
                                font.bold: true
                                font.letterSpacing: 0.5
                            }

                            Flow {
                                Layout.fillWidth: true
                                spacing: 6

                                Repeater {
                                    model: dictRoot.synonyms
                                    Rectangle {
                                        radius: 6
                                        color: "#1c1b2c"
                                        border.color: "#2e2b44"
                                        border.width: 1
                                        implicitWidth: synTxt.implicitWidth + 12
                                        implicitHeight: synTxt.implicitHeight + 6

                                        Text {
                                            id: synTxt
                                            anchors.centerIn: parent
                                            text: modelData
                                            color: "#ddd6fe"
                                            font.pixelSize: 11
                                        }

                                        MouseArea {
                                            anchors.fill: parent
                                            cursorShape: Qt.PointingHandCursor
                                            onClicked: {
                                                dictRoot.targetWord = modelData
                                                dictRoot.fetchDefinition(modelData)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Footer Action Bar
            Rectangle {
                Layout.fillWidth: true
                Layout.preferredHeight: 48
                color: "#12111d"
                radius: 10
                border.color: "#28263c"
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 12
                    anchors.rightMargin: 12
                    spacing: 8

                    // Color tag indicators
                    Row {
                        spacing: 6
                        Repeater {
                            model: [
                                { name: "yellow", color: "#facc15" },
                                { name: "green", color: "#4ade80" },
                                { name: "blue", color: "#60a5fa" },
                                { name: "purple", color: "#c084fc" }
                            ]
                            Rectangle {
                                width: 16
                                height: 16
                                radius: 8
                                color: modelData.color
                                border.color: dictRoot.activeColor === modelData.name ? "#ffffff" : "transparent"
                                border.width: dictRoot.activeColor === modelData.name ? 2 : 0
                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: dictRoot.activeColor = modelData.name
                                }
                            }
                        }
                    }

                    Item { Layout.fillWidth: true }

                    // Save Bookmark Button
                    Rectangle {
                        implicitWidth: saveTxt.implicitWidth + 24
                        implicitHeight: 32
                        radius: 8
                        color: dictRoot.isSaved ? "#065f46" : (saveMa.containsMouse ? "#4f46e5" : "#6366f1")
                        border.color: dictRoot.isSaved ? "#10b981" : "#818cf8"
                        border.width: 1

                        Text {
                            id: saveTxt
                            anchors.centerIn: parent
                            text: dictRoot.isSaved ? "✓ Salvo no Vocabulário" : "⭐ Salvar no Vocabulário"
                            color: "#ffffff"
                            font.pixelSize: 12
                            font.bold: true
                        }

                        MouseArea {
                            id: saveMa
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                dictRoot.isSaved = true
                                dictRoot.bookmarkSaved(dictRoot.targetWord, dictRoot.sceneContext, dictRoot.activeColor)
                            }
                        }
                    }
                }
            }
        }
    }
}
