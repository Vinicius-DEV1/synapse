import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: quizRoot
    color: "#0f0e17"
    focus: true

    property int currentIndex: 0
    property int totalQuestions: sampleQuestions.length
    property int selectedOption: -1
    property bool isConfirmed: false
    property bool showExplanation: false
    property int score: 0

    // Sample data structure matching Synapse quiz_questions schema
    property var sampleQuestions: [
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

    readonly property var currentQ: sampleQuestions[currentIndex]

    Component.onCompleted: {
        loadRealQuestions();
    }

    function loadRealQuestions() {
        var bats = dataController.getQuizBatteries();
        if (bats && bats.length > 0) {
            var allQ = [];
            for (var b = 0; b < bats.length; b++) {
                var qList = dataController.getBatteryQuestions(bats[b].id);
                for (var i = 0; i < qList.length; i++) {
                    var q = qList[i];
                    var opts = [];
                    try {
                        opts = JSON.parse(q.options);
                    } catch (e) {
                        opts = [q.options];
                    }
                    allQ.push({
                        id: q.id,
                        batteryId: q.battery_id,
                        prompt: q.question,
                        options: opts,
                        correctIndex: q.correct_index,
                        explanation: q.explanation || "Sem explicação cadastrada."
                    });
                }
            }
            if (allQ.length > 0) {
                sampleQuestions = allQ;
                totalQuestions = allQ.length;
                currentIndex = 0;
            }
        }
    }

    function selectOption(index) {
        if (!isConfirmed) {
            selectedOption = index;
        }
    }

    function confirmOrNext() {
        if (!isConfirmed) {
            if (selectedOption !== -1) {
                isConfirmed = true;
                var isRight = (selectedOption === currentQ.correctIndex);
                if (isRight) {
                    score++;
                }
                dataController.recordQuizAttempt(currentQ.batteryId || "", currentQ.id || "", selectedOption, isRight);
            }
        } else {
            // Next question
            if (currentIndex < totalQuestions - 1) {
                currentIndex++;
                selectedOption = -1;
                isConfirmed = false;
                showExplanation = false;
            } else {
                // Completed session
                finishDialog.visible = true;
            }
        }
    }

    function toggleGabarito() {
        if (isConfirmed) {
            showExplanation = !showExplanation;
        }
    }

    // Top subtle progress header
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
                text: "🎯 Modo Zen Focus"
                color: "#71717a"
                font.pixelSize: 13
                font.weight: Font.Medium
            }

            Item { Layout.fillWidth: true }

            // Single source of progress truth: "01 / 03"
            Text {
                text: (quizRoot.currentIndex + 1 < 10 ? "0" : "") + (quizRoot.currentIndex + 1) + " / " + (quizRoot.totalQuestions < 10 ? "0" : "") + quizRoot.totalQuestions
                color: "#e4e4e7"
                font.pixelSize: 13
                font.bold: true
                font.family: "Monospace"
            }
        }

        // Discrete 2px Progress Line
        Rectangle {
            anchors.bottom: parent.bottom
            anchors.left: parent.left
            height: 2
            width: parent.width * ((quizRoot.currentIndex + (quizRoot.isConfirmed ? 1 : 0.2)) / quizRoot.totalQuestions)
            color: "#6366f1"

            Behavior on width {
                NumberAnimation { duration: 250; easing.type: Easing.OutQuad }
            }
        }
    }

    // Center Scrollable Reading Column (max-w-2xl equivalent: 720px)
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

                        // Adaptive styling according to Section 10.2
                        color: {
                            if (!quizRoot.isConfirmed) {
                                return isSelected ? "#27272a" : (optMouse.containsMouse ? "#1c1b2e" : "#161524");
                            }
                            if (isCorrect) return "#10b98118";
                            if (isSelected && !isCorrect) return "#f43f5e18";
                            return "#161524";
                        }

                        border.color: {
                            if (!quizRoot.isConfirmed) {
                                return isSelected ? "#6366f1" : (optMouse.containsMouse ? "#ffffff20" : "#ffffff0d");
                            }
                            if (isCorrect) return "#10b98150";
                            if (isSelected && !isCorrect) return "#f43f5e50";
                            return "#ffffff08";
                        }
                        border.width: isSelected || (quizRoot.isConfirmed && isCorrect) ? 1.5 : 1

                        RowLayout {
                            anchors.fill: parent
                            anchors.leftMargin: 16
                            anchors.rightMargin: 16
                            spacing: 14

                            // Key Badge (A, B, C, D)
                            Rectangle {
                                width: 26
                                height: 26
                                radius: 5
                                color: optionBox.isSelected ? "#6366f1" : "#27272a"

                                Text {
                                    anchors.centerIn: parent
                                    text: String.fromCharCode(65 + index)
                                    color: optionBox.isSelected ? "#ffffff" : "#a1a1aa"
                                    font.pixelSize: 12
                                    font.bold: true
                                }
                            }

                            // Option text
                            Text {
                                id: optText
                                Layout.fillWidth: true
                                text: modelData
                                color: {
                                    if (quizRoot.isConfirmed && optionBox.isCorrect) return "#6ee7b7";
                                    if (quizRoot.isConfirmed && optionBox.isSelected && !optionBox.isCorrect) return "#fda4af";
                                    return optionBox.isSelected ? "#ffffff" : "#d4d4d8";
                                }
                                font.pixelSize: 15
                                wrapMode: Text.Wrap
                                lineHeight: 1.35
                            }
                        }

                        MouseArea {
                            id: optMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: quizRoot.selectOption(index)
                        }
                    }
                }
            }

            // Explanation / Gabarito Box
            Rectangle {
                id: explanationBox
                Layout.fillWidth: true
                visible: quizRoot.isConfirmed && quizRoot.showExplanation
                implicitHeight: expContent.implicitHeight + 24
                radius: 8
                color: "#f59e0b12"
                border.color: "#f59e0b35"
                border.width: 1

                ColumnLayout {
                    id: expContent
                    anchors.fill: parent
                    anchors.margins: 16
                    spacing: 8

                    Text {
                        text: "💡 Explicação do Gabarito"
                        color: "#fbbf24"
                        font.pixelSize: 14
                        font.bold: true
                    }

                    Text {
                        Layout.fillWidth: true
                        text: currentQ.explanation
                        color: "#fef3c7"
                        font.pixelSize: 14
                        wrapMode: Text.Wrap
                        lineHeight: 1.4
                    }
                }
            }
        }
    }

    // Bottom Action & Keyboard Shortcuts Bar
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

            // Discrete shortcut cues
            Row {
                spacing: 16
                Text {
                    text: "[1-4 / A-D] Selecionar"
                    color: "#71717a"
                    font.pixelSize: 12
                }
                Text {
                    text: "[Enter] Confirmar"
                    color: "#71717a"
                    font.pixelSize: 12
                }
                Text {
                    text: "[G] Gabarito"
                    color: "#71717a"
                    font.pixelSize: 12
                    visible: quizRoot.isConfirmed
                }
            }

            Item { Layout.fillWidth: true }

            // Gabarito Toggle Button (visible after answer)
            Button {
                visible: quizRoot.isConfirmed
                implicitHeight: 36
                text: quizRoot.showExplanation ? "Ocultar Gabarito" : "Ver Gabarito [G]"
                onClicked: quizRoot.toggleGabarito()
                background: Rectangle {
                    color: "#27272a"
                    radius: 6
                    border.color: "#ffffff15"
                }
                contentItem: Text {
                    text: parent.text
                    color: "#fbbf24"
                    font.pixelSize: 13
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }

            // Main Progression Action Button
            Button {
                id: mainActionBtn
                implicitHeight: 38
                implicitWidth: 140
                background: Rectangle {
                    color: quizRoot.selectedOption === -1 ? "#27272a" : "#6366f1"
                    radius: 6
                }
                contentItem: Text {
                    text: !quizRoot.isConfirmed ? "Confirmar [↵]" : (quizRoot.currentIndex < quizRoot.totalQuestions - 1 ? "Próxima [↵]" : "Concluir [↵]")
                    color: quizRoot.selectedOption === -1 ? "#71717a" : "#ffffff"
                    font.pixelSize: 13
                    font.bold: true
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
                onClicked: quizRoot.confirmOrNext()
            }
        }
    }

    // Completion Dialog Screen
    Rectangle {
        id: finishDialog
        anchors.fill: parent
        color: "#0f0e17ee"
        visible: false

        ColumnLayout {
            anchors.centerIn: parent
            spacing: 20

            Text {
                Layout.alignment: Qt.AlignHCenter
                text: "🎉 Bateria Concluída!"
                color: "#ffffff"
                font.pixelSize: 24
                font.bold: true
            }

            Text {
                Layout.alignment: Qt.AlignHCenter
                text: "Pontuação: " + quizRoot.score + " de " + quizRoot.totalQuestions + " acertos (" + Math.round((quizRoot.score / quizRoot.totalQuestions) * 100) + "%)"
                color: "#34d399"
                font.pixelSize: 16
            }

            Button {
                Layout.alignment: Qt.AlignHCenter
                text: "Reiniciar Sessão"
                onClicked: {
                    quizRoot.currentIndex = 0;
                    quizRoot.selectedOption = -1;
                    quizRoot.isConfirmed = false;
                    quizRoot.showExplanation = false;
                    quizRoot.score = 0;
                    finishDialog.visible = false;
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
        if (event.key === Qt.Key_A) { quizRoot.selectOption(0); event.accepted = true; }
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

