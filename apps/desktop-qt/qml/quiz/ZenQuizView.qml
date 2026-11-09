import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: quizRoot
    color: "#0f0e17"
    focus: true

    property bool isSessionActive: false
    property var batteries: []
    property var activeBattery: null
    property var questions: []
    property int currentIndex: 0
    property int totalQuestions: 0
    property int selectedOption: -1
    property bool isConfirmed: false
    property bool showExplanation: false
    property int score: 0

    // Modals
    property bool isCreatingBattery: false
    property bool isCreatingQuestion: false
    property var targetBatteryForQuestion: null

    // Default fallback questions if database battery is empty
    property var defaultQuestions: [
        {
            id: "q1",
            batteryId: "bat-crypto-01",
            prompt: "No protocolo Diffie-Hellman sobre curvas elípticas (ECDH), qual é a principal vantagem em relação ao Diffie-Hellman clássico baseado no problema do logaritmo discreto sobre corpos finitos?",
            options: [
                "Permite chaves significativamente menores para o mesmo nível equivalente de segurança criptográfica.",
                "Dispensa completamente o uso de números primos grandes na geração dos parâmetros de domínio.",
                "Torna a troca de chaves imune a ataques por computadores quânticos através do algoritmo de Shor.",
                "Permite cifração direta de mensagens sem a necessidade de uma cifra simétrica auxiliar."
            ],
            correctIndex: 0,
            explanation: "As curvas elípticas oferecem segurança equivalente com chaves muito menores (ex: chave ECC de 256 bits equivale a RSA de 3072 bits), reduzindo drasticamente consumo de banda e CPU."
        },
        {
            id: "q2",
            batteryId: "bat-crypto-01",
            prompt: "Qual modo de operação de cifra de bloco fornece simultaneamente confidencialidade e autenticação de integridade (AEAD) através da multiplicação em Galois Field GF(2^128)?",
            options: [
                "CBC (Cipher Block Chaining)",
                "CTR (Counter Mode)",
                "GCM (Galois/Counter Mode)",
                "OFB (Output Feedback)"
            ],
            correctIndex: 2,
            explanation: "O AES-GCM combina o modo CTR para confidencialidade com o autenticador GMAC baseado em multiplicação polinomial em GF(2^128) para autenticar o texto cifrado e dados adicionais (AAD)."
        },
        {
            id: "q3",
            batteryId: "bat-crypto-01",
            prompt: "No algoritmo FSRS v5 (Free Spaced Repetition Scheduler), quais são as três variáveis fundamentais de memória modeladas pelo DSR Model?",
            options: [
                "Dificuldade (D), Estabilidade (S) e Retrievabilidade (R)",
                "Duração (D), Severidade (S) e Recorrência (R)",
                "Densidade (D), Separação (S) e Retenção (R)",
                "Divergência (D), Sensibilidade (S) e Repetição (R)"
            ],
            correctIndex: 0,
            explanation: "O FSRS v5 baseia-se no modelo DSR: D (Dificuldade do cartão, 1 a 10), S (Estabilidade em dias até a probabilidade de recall cair para 90%) e R (Retrievabilidade percentual no momento da revisão)."
        }
    ]

    readonly property var currentQ: (questions.length > 0 && currentIndex < questions.length)
        ? questions[currentIndex]
        : { prompt: "", options: [], correctIndex: 0, explanation: "" }

    Component.onCompleted: {
        loadBatteries()
    }

    function loadBatteries() {
        batteries = dataController.getQuizBatteries()
    }

    function startBatterySession(battery) {
        activeBattery = battery
        var qList = battery ? dataController.getBatteryQuestions(battery.id) : []
        var parsedList = []

        for (var i = 0; i < qList.length; i++) {
            var q = qList[i]
            var opts = []
            try {
                opts = JSON.parse(q.options)
            } catch (e) {
                opts = [q.options]
            }
            parsedList.push({
                id: q.id,
                batteryId: q.battery_id,
                prompt: q.question,
                options: opts,
                correctIndex: q.correct_index,
                explanation: q.explanation || "Sem explicação cadastrada."
            })
        }

        if (parsedList.length === 0) {
            parsedList = defaultQuestions
        }

        questions = parsedList
        totalQuestions = parsedList.length
        currentIndex = 0
        selectedOption = -1
        isConfirmed = false
        showExplanation = false
        score = 0
        isSessionActive = true
        finishDialog.visible = false
    }

    function selectOption(index) {
        if (!isConfirmed && isSessionActive) {
            selectedOption = index
        }
    }

    function confirmOrNext() {
        if (!isSessionActive) return

        if (!isConfirmed) {
            if (selectedOption !== -1) {
                isConfirmed = true
                var isRight = (selectedOption === currentQ.correctIndex)
                if (isRight) {
                    score++
                }
                dataController.recordQuizAttempt(currentQ.batteryId || "", currentQ.id || "", selectedOption, isRight)
            }
        } else {
            // Next question
            if (currentIndex < totalQuestions - 1) {
                currentIndex++
                selectedOption = -1
                isConfirmed = false
                showExplanation = false
            } else {
                finishDialog.visible = true
            }
        }
    }

    function toggleGabarito() {
        if (isConfirmed) {
            showExplanation = !showExplanation
        }
    }

    // ===================================================================
    // 1. Batteries Explorer View (When Simulado is Not Active)
    // ===================================================================
    Item {
        anchors.fill: parent
        visible: !quizRoot.isSessionActive

        ScrollView {
            anchors.fill: parent
            clip: true
            contentWidth: width

            ColumnLayout {
                width: Math.min(parent.width - 64, 1024)
                anchors.horizontalCenter: parent.horizontalCenter
                spacing: 24

                Item { height: 16 }

                // Header
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 16

                    ColumnLayout {
                        spacing: 4
                        RowLayout {
                            spacing: 10
                            Text { text: "🎯"; font.pixelSize: 28 }
                            Text {
                                text: "Banco de Questões & Simulado Zen"
                                color: "#fffffe"
                                font.pixelSize: 26
                                font.bold: true
                            }
                        }
                        Text {
                            text: "Resolução imersiva de questões de concursos e certificações • Design Zen sem poluição visual"
                            color: "#a7a9be"
                            font.pixelSize: 13
                        }
                    }

                    Item { Layout.fillWidth: true }

                    // Quick Practice button
                    Rectangle {
                        width: 150; height: 38; radius: 10
                        color: "#1a1924"
                        border.color: "#ffffff15"

                        RowLayout {
                            anchors.centerIn: parent
                            spacing: 6
                            Text { text: "⚡"; font.pixelSize: 13 }
                            Text { text: "Simulado Geral"; color: "#fffffe"; font.pixelSize: 12; font.bold: true }
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: quizRoot.startBatterySession(null)
                        }
                    }

                    // "+ Nova Bateria" button
                    Rectangle {
                        width: 140; height: 38; radius: 10
                        color: "#6366f1"

                        RowLayout {
                            anchors.centerIn: parent
                            spacing: 6
                            Text { text: "+"; color: "#ffffff"; font.pixelSize: 16; font.bold: true }
                            Text { text: "Nova Bateria"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: quizRoot.isCreatingBattery = true
                        }
                    }
                }

                // Batteries Grid
                GridView {
                    id: batteryGrid
                    Layout.fillWidth: true
                    Layout.preferredHeight: Math.max(300, Math.ceil(quizRoot.batteries.length / Math.max(1, Math.floor(width / 340))) * 180)
                    clip: true
                    cellWidth: 340
                    cellHeight: 180
                    model: quizRoot.batteries

                    delegate: Rectangle {
                        width: 320
                        height: 160
                        radius: 12
                        color: "#1a1924"
                        border.color: batMouse.containsMouse ? "#6366f166" : "#ffffff0f"
                        border.width: 1

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 18
                            spacing: 10

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8
                                Text { text: "📦"; font.pixelSize: 16 }
                                Text {
                                    Layout.fillWidth: true
                                    text: modelData.title || "Bateria sem título"
                                    color: "#fffffe"
                                    font.pixelSize: 15
                                    font.bold: true
                                    elide: Text.ElideRight
                                }
                                Rectangle {
                                    width: countText.contentWidth + 12
                                    height: 22
                                    radius: 11
                                    color: "#6366f120"
                                    Text {
                                        id: countText
                                        anchors.centerIn: parent
                                        text: (modelData.question_count || 0) + " Q"
                                        color: "#a78bfa"
                                        font.pixelSize: 11
                                        font.bold: true
                                    }
                                }
                            }

                            Text {
                                Layout.fillWidth: true
                                text: modelData.description || "Sem descrição"
                                color: "#a7a9be"
                                font.pixelSize: 12
                                elide: Text.ElideRight
                            }

                            Item { Layout.fillHeight: true }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8

                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 32
                                    radius: 8
                                    color: "#6366f1"

                                    RowLayout {
                                        anchors.centerIn: parent
                                        spacing: 6
                                        Text { text: "▶"; color: "#ffffff"; font.pixelSize: 10 }
                                        Text { text: "Resolver"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                                    }

                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: quizRoot.startBatterySession(modelData)
                                    }
                                }

                                Rectangle {
                                    width: 32; height: 32; radius: 8
                                    color: "#ffffff0a"

                                    Text { anchors.centerIn: parent; text: "+"; color: "#a7a9be"; font.pixelSize: 16; font.bold: true }

                                    MouseArea {
                                        anchors.fill: parent
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: {
                                            quizRoot.targetBatteryForQuestion = modelData
                                            quizRoot.isCreatingQuestion = true
                                        }
                                    }
                                }
                            }
                        }

                        MouseArea {
                            id: batMouse
                            anchors.fill: parent
                            z: -1
                            hoverEnabled: true
                        }
                    }
                }

                // If no custom batteries, show quick start banner
                Rectangle {
                    visible: quizRoot.batteries.length === 0
                    Layout.fillWidth: true
                    height: 220
                    radius: 16
                    color: "#161524"
                    border.color: "#ffffff0f"

                    ColumnLayout {
                        anchors.centerIn: parent
                        spacing: 12
                        Text { Layout.alignment: Qt.AlignHCenter; text: "💡"; font.pixelSize: 36 }
                        Text {
                            Layout.alignment: Qt.AlignHCenter
                            text: "Nenhuma bateria personalizada criada ainda"
                            color: "#fffffe"
                            font.pixelSize: 16
                            font.bold: true
                        }
                        Text {
                            Layout.alignment: Qt.AlignHCenter
                            text: "Você pode criar uma bateria agora ou experimentar o Simulado Geral com questões exemplo de Criptografia e FSRS."
                            color: "#a7a9be"
                            font.pixelSize: 13
                        }
                        Item { height: 4 }
                        Rectangle {
                            Layout.alignment: Qt.AlignHCenter
                            width: 180; height: 38; radius: 8
                            color: "#6366f1"
                            RowLayout {
                                anchors.centerIn: parent
                                spacing: 6
                                Text { text: "▶"; color: "#ffffff"; font.pixelSize: 10 }
                                Text { text: "Iniciar Simulado Exemplo"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                            }
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: quizRoot.startBatterySession(null)
                            }
                        }
                    }
                }

                Item { height: 48 }
            }
        }
    }

    // ===================================================================
    // 2. Zen Focus Session Mode
    // ===================================================================
    Item {
        anchors.fill: parent
        visible: quizRoot.isSessionActive

        // Top progress header
        Rectangle {
            id: headerBar
            anchors.top: parent.top
            anchors.left: parent.left
            anchors.right: parent.right
            height: 52
            color: "#161524"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 24
                anchors.rightMargin: 24

                Text {
                    text: (quizRoot.activeBattery ? quizRoot.activeBattery.title : "Simulado Geral") + " • Zen Focus"
                    color: "#a78bfa"
                    font.pixelSize: 13
                    font.bold: true
                }

                Item { Layout.fillWidth: true }

                // Exit Button
                Rectangle {
                    width: 64; height: 28; radius: 6
                    color: "#ffffff10"

                    Text { anchors.centerIn: parent; text: "Esc Sair"; color: "#a7a9be"; font.pixelSize: 11; font.bold: true }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: quizRoot.isSessionActive = false
                    }
                }

                // Progress "01 / 10"
                Text {
                    text: (quizRoot.currentIndex + 1 < 10 ? "0" : "") + (quizRoot.currentIndex + 1) + " / " + (quizRoot.totalQuestions < 10 ? "0" : "") + quizRoot.totalQuestions
                    color: "#e4e4e7"
                    font.pixelSize: 13
                    font.bold: true
                    font.family: "Monospace"
                }
            }

            // 2px Progress Line
            Rectangle {
                anchors.bottom: parent.bottom
                anchors.left: parent.left
                height: 2
                width: parent.width * ((quizRoot.currentIndex + (quizRoot.isConfirmed ? 1 : 0.2)) / Math.max(1, quizRoot.totalQuestions))
                color: "#6366f1"

                Behavior on width {
                    NumberAnimation { duration: 250; easing.type: Easing.OutQuad }
                }
            }
        }

        // Center Scrollable Reading Column
        Flickable {
            id: contentFlick
            anchors.top: headerBar.bottom
            anchors.bottom: footerBar.top
            anchors.left: parent.left
            anchors.right: parent.right
            contentWidth: parent.width
            contentHeight: centerColumn.implicitHeight + 48
            clip: true

            ColumnLayout {
                id: centerColumn
                width: Math.min(parent.width - 48, 720)
                anchors.horizontalCenter: parent.horizontalCenter
                anchors.top: parent.top
                anchors.topMargin: 32
                spacing: 24

                // Question Statement / Enunciado
                Text {
                    Layout.fillWidth: true
                    text: currentQ.prompt
                    color: "#f4f4f5"
                    font.pixelSize: 17
                    font.weight: Font.Normal
                    font.family: "Inter, sans-serif"
                    wrapMode: Text.Wrap
                    lineHeight: 1.45
                }

                Item { Layout.preferredHeight: 4 }

                // Vertical Stacking Options (A, B, C, D)
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    Repeater {
                        model: currentQ.options
                        delegate: Rectangle {
                            id: optionBox
                            Layout.fillWidth: true
                            implicitHeight: optText.implicitHeight + 28
                            radius: 8

                            property int optionIdx: index
                            property bool isSelected: quizRoot.selectedOption === optionIdx
                            property bool isCorrect: optionIdx === currentQ.correctIndex

                            color: {
                                if (!quizRoot.isConfirmed) {
                                    return isSelected ? "#27272a" : (optMouse.containsMouse ? "#1c1b2e" : "#161524")
                                }
                                if (isCorrect) return "#10b98118"
                                if (isSelected && !isCorrect) return "#f43f5e18"
                                return "#161524"
                            }

                            border.color: {
                                if (!quizRoot.isConfirmed) {
                                    return isSelected ? "#6366f1" : (optMouse.containsMouse ? "#ffffff20" : "#ffffff0d")
                                }
                                if (isCorrect) return "#10b98150"
                                if (isSelected && !isCorrect) return "#f43f5e50"
                                return "#ffffff08"
                            }
                            border.width: isSelected || (quizRoot.isConfirmed && isCorrect) ? 1.5 : 1

                            RowLayout {
                                anchors.fill: parent
                                anchors.margins: 14
                                spacing: 14

                                // Shortcut badge (A, B, C, D)
                                Rectangle {
                                    width: 24
                                    height: 24
                                    radius: 4
                                    color: {
                                        if (!quizRoot.isConfirmed) {
                                            return optionBox.isSelected ? "#6366f1" : "#27272a"
                                        }
                                        if (optionBox.isCorrect) return "#10b981"
                                        if (optionBox.isSelected && !optionBox.isCorrect) return "#f43f5e"
                                        return "#27272a"
                                    }

                                    Text {
                                        anchors.centerIn: parent
                                        text: String.fromCharCode(65 + optionIdx)
                                        color: "#ffffff"
                                        font.pixelSize: 11
                                        font.bold: true
                                    }
                                }

                                Text {
                                    id: optText
                                    Layout.fillWidth: true
                                    text: modelData
                                    color: {
                                        if (!quizRoot.isConfirmed) {
                                            return optionBox.isSelected ? "#ffffff" : "#d4d4d8"
                                        }
                                        if (optionBox.isCorrect) return "#34d399"
                                        if (optionBox.isSelected && !optionBox.isCorrect) return "#fb7185"
                                        return "#71717a"
                                    }
                                    font.pixelSize: 15
                                    font.family: "Inter, sans-serif"
                                    wrapMode: Text.Wrap
                                    lineHeight: 1.35
                                }
                            }

                            MouseArea {
                                id: optMouse
                                anchors.fill: parent
                                hoverEnabled: !quizRoot.isConfirmed
                                cursorShape: quizRoot.isConfirmed ? Qt.ArrowCursor : Qt.PointingHandCursor
                                onClicked: quizRoot.selectOption(optionIdx)
                            }
                        }
                    }
                }

                // Gabarito / Explanation Expandable Drawer
                Rectangle {
                    Layout.fillWidth: true
                    visible: quizRoot.isConfirmed && quizRoot.showExplanation
                    implicitHeight: explCol.implicitHeight + 24
                    radius: 8
                    color: "#18181b"
                    border.color: "#fbbf2430"
                    border.width: 1

                    ColumnLayout {
                        id: explCol
                        anchors.fill: parent
                        anchors.margins: 16
                        spacing: 8

                        RowLayout {
                            spacing: 8
                            Text { text: "💡"; font.pixelSize: 14 }
                            Text {
                                text: "GABARITO COMENTADO"
                                color: "#fbbf24"
                                font.pixelSize: 11
                                font.bold: true
                                font.letterSpacing: 1.2
                            }
                        }

                        Text {
                            Layout.fillWidth: true
                            text: currentQ.explanation
                            color: "#d4d4d8"
                            font.pixelSize: 14
                            wrapMode: Text.Wrap
                            lineHeight: 1.4
                        }
                    }
                }
            }
        }

        // Discrete Fixed Bottom Dock
        Rectangle {
            id: footerBar
            anchors.bottom: parent.bottom
            anchors.left: parent.left
            anchors.right: parent.right
            height: 64
            color: "#161524"

            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 24
                anchors.rightMargin: 24

                Row {
                    spacing: 16
                    Text { text: "[1-4 / A-D] Selecionar"; color: "#71717a"; font.pixelSize: 12 }
                    Text { text: "[Enter] Confirmar"; color: "#71717a"; font.pixelSize: 12 }
                    Text { text: "[G] Gabarito"; color: "#71717a"; font.pixelSize: 12; visible: quizRoot.isConfirmed }
                }

                Item { Layout.fillWidth: true }

                // Gabarito Toggle Button
                Button {
                    visible: quizRoot.isConfirmed
                    implicitHeight: 36
                    text: quizRoot.showExplanation ? "Ocultar Gabarito" : "Ver Gabarito [G]"
                    onClicked: quizRoot.toggleGabarito()
                }

                // Main Action Button
                Rectangle {
                    implicitHeight: 38
                    implicitWidth: 140
                    radius: 6
                    color: quizRoot.selectedOption === -1 ? "#27272a" : "#6366f1"

                    Text {
                        anchors.centerIn: parent
                        text: !quizRoot.isConfirmed ? "Confirmar [↵]" : (quizRoot.currentIndex < quizRoot.totalQuestions - 1 ? "Próxima [↵]" : "Concluir [↵]")
                        color: quizRoot.selectedOption === -1 ? "#71717a" : "#ffffff"
                        font.pixelSize: 13
                        font.bold: true
                    }

                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: quizRoot.confirmOrNext()
                    }
                }
            }
        }
    }

    // Completion Dialog Screen
    Rectangle {
        id: finishDialog
        anchors.fill: parent
        color: "#0f0e17ee"
        visible: false
        z: 100

        ColumnLayout {
            anchors.centerIn: parent
            spacing: 20

            Text {
                Layout.alignment: Qt.AlignHCenter
                text: "🎉 Simulado Concluído!"
                color: "#ffffff"
                font.pixelSize: 24
                font.bold: true
            }

            Text {
                Layout.alignment: Qt.AlignHCenter
                text: "Pontuação: " + quizRoot.score + " de " + quizRoot.totalQuestions + " acertos (" + (quizRoot.totalQuestions > 0 ? Math.round((quizRoot.score / quizRoot.totalQuestions) * 100) : 0) + "%)"
                color: "#34d399"
                font.pixelSize: 16
            }

            RowLayout {
                Layout.alignment: Qt.AlignHCenter
                spacing: 12

                Button {
                    text: "Voltar às Baterias"
                    onClicked: {
                        finishDialog.visible = false
                        quizRoot.isSessionActive = false
                        quizRoot.loadBatteries()
                    }
                }

                Button {
                    text: "Reiniciar Sessão"
                    onClicked: {
                        quizRoot.currentIndex = 0
                        quizRoot.selectedOption = -1
                        quizRoot.isConfirmed = false
                        quizRoot.showExplanation = false
                        quizRoot.score = 0
                        finishDialog.visible = false
                    }
                }
            }
        }
    }

    // Modal: Criar Nova Bateria
    Rectangle {
        anchors.fill: parent
        color: "#b3000000"
        visible: quizRoot.isCreatingBattery
        z: 120

        MouseArea { anchors.fill: parent }

        Rectangle {
            anchors.centerIn: parent
            width: 440; height: 280; radius: 16
            color: "#161524"; border.color: "#ffffff18"

            ColumnLayout {
                anchors.fill: parent; anchors.margins: 24; spacing: 14

                Text { text: "Nova Bateria de Questões"; color: "#fffffe"; font.pixelSize: 17; font.bold: true }

                TextField {
                    id: batteryTitleInput
                    Layout.fillWidth: true
                    placeholderText: "Título da bateria (ex: Redes de Computadores)..."
                    color: "#ffffff"
                    background: Rectangle { color: "#0f0e17"; border.color: "#ffffff1a"; radius: 8 }
                }

                TextField {
                    id: batteryDescInput
                    Layout.fillWidth: true
                    placeholderText: "Descrição opcional..."
                    color: "#ffffff"
                    background: Rectangle { color: "#0f0e17"; border.color: "#ffffff1a"; radius: 8 }
                }

                Item { Layout.fillHeight: true }

                RowLayout {
                    Layout.fillWidth: true; spacing: 12
                    Button {
                        text: "Cancelar"
                        Layout.fillWidth: true
                        onClicked: {
                            quizRoot.isCreatingBattery = false
                            batteryTitleInput.text = ""
                            batteryDescInput.text = ""
                        }
                    }
                    Button {
                        text: "Criar Bateria"
                        Layout.fillWidth: true
                        onClicked: {
                            if (batteryTitleInput.text.trim().length > 0) {
                                dataController.createQuizBattery(batteryTitleInput.text.trim(), batteryDescInput.text.trim())
                                batteryTitleInput.text = ""
                                batteryDescInput.text = ""
                                quizRoot.isCreatingBattery = false
                                quizRoot.loadBatteries()
                            }
                        }
                    }
                }
            }
        }
    }

    // Modal: Criar Nova Questão
    Rectangle {
        anchors.fill: parent
        color: "#b3000000"
        visible: quizRoot.isCreatingQuestion
        z: 130

        MouseArea { anchors.fill: parent }

        Rectangle {
            anchors.centerIn: parent
            width: 520; height: 460; radius: 16
            color: "#161524"; border.color: "#ffffff18"

            ColumnLayout {
                anchors.fill: parent; anchors.margins: 24; spacing: 12

                Text {
                    text: "Adicionar Questão em " + (quizRoot.targetBatteryForQuestion ? quizRoot.targetBatteryForQuestion.title : "Bateria")
                    color: "#fffffe"
                    font.pixelSize: 16
                    font.bold: true
                }

                TextField {
                    id: qPromptInput
                    Layout.fillWidth: true
                    placeholderText: "Enunciado da questão..."
                    color: "#ffffff"
                    background: Rectangle { color: "#0f0e17"; border.color: "#ffffff1a"; radius: 8 }
                }

                TextField { id: optA; Layout.fillWidth: true; placeholderText: "Alternativa A (Correta)..."; color: "#ffffff"; background: Rectangle { color: "#0f0e17"; border.color: "#ffffff1a"; radius: 8 } }
                TextField { id: optB; Layout.fillWidth: true; placeholderText: "Alternativa B..."; color: "#ffffff"; background: Rectangle { color: "#0f0e17"; border.color: "#ffffff1a"; radius: 8 } }
                TextField { id: optC; Layout.fillWidth: true; placeholderText: "Alternativa C..."; color: "#ffffff"; background: Rectangle { color: "#0f0e17"; border.color: "#ffffff1a"; radius: 8 } }
                TextField { id: optD; Layout.fillWidth: true; placeholderText: "Alternativa D..."; color: "#ffffff"; background: Rectangle { color: "#0f0e17"; border.color: "#ffffff1a"; radius: 8 } }

                TextField {
                    id: qExplInput
                    Layout.fillWidth: true
                    placeholderText: "Explicação ou gabarito comentado..."
                    color: "#ffffff"
                    background: Rectangle { color: "#0f0e17"; border.color: "#ffffff1a"; radius: 8 }
                }

                RowLayout {
                    Layout.fillWidth: true; spacing: 12
                    Button {
                        text: "Cancelar"
                        Layout.fillWidth: true
                        onClicked: quizRoot.isCreatingQuestion = false
                    }
                    Button {
                        text: "Salvar Questão"
                        Layout.fillWidth: true
                        onClicked: {
                            if (qPromptInput.text.trim().length > 0 && quizRoot.targetBatteryForQuestion) {
                                var opts = [optA.text, optB.text, optC.text, optD.text]
                                dataController.createQuizQuestion(
                                    quizRoot.targetBatteryForQuestion.id,
                                    qPromptInput.text.trim(),
                                    JSON.stringify(opts),
                                    0, // Opt A correct by default
                                    qExplInput.text.trim()
                                )
                                qPromptInput.text = ""
                                optA.text = ""
                                optB.text = ""
                                optC.text = ""
                                optD.text = ""
                                qExplInput.text = ""
                                quizRoot.isCreatingQuestion = false
                                quizRoot.loadBatteries()
                            }
                        }
                    }
                }
            }
        }
    }

    // Hardware Keyboard-First Fluidity
    Keys.onDigit1Pressed: quizRoot.selectOption(0)
    Keys.onDigit2Pressed: quizRoot.selectOption(1)
    Keys.onDigit3Pressed: quizRoot.selectOption(2)
    Keys.onDigit4Pressed: quizRoot.selectOption(3)

    Keys.onPressed: function(event) {
        if (event.key === Qt.Key_Escape) {
            if (quizRoot.isSessionActive) {
                quizRoot.isSessionActive = false
                event.accepted = true
            }
        } else if (event.key === Qt.Key_A) { quizRoot.selectOption(0); event.accepted = true; }
        else if (event.key === Qt.Key_B) { quizRoot.selectOption(1); event.accepted = true; }
        else if (event.key === Qt.Key_C) { quizRoot.selectOption(2); event.accepted = true; }
        else if (event.key === Qt.Key_D) { quizRoot.selectOption(3); event.accepted = true; }
        else if (event.key === Qt.Key_G) { quizRoot.toggleGabarito(); event.accepted = true; }
        else if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter || event.key === Qt.Key_Space) {
            quizRoot.confirmOrNext();
            event.accepted = true;
        }
    }
}
