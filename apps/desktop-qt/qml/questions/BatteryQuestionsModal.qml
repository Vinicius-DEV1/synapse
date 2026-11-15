import QtQuick 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: questionsModalRoot
    anchors.fill: parent
    color: "#b3000000"
    visible: isOpen
    z: 115

    property bool isOpen: false
    property var battery: null
    property var questions: []

    signal closed()
    signal requestAddQuestion(var battery)
    signal requestEditQuestion(var question)
    signal requestDeleteQuestion(string questionId)
    signal requestAIGeneration(var battery)
    signal requestImport(var battery)
    signal requestSequentialMode(var battery)

    MouseArea { anchors.fill: parent }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 48, 880)
        height: Math.min(parent.height - 48, 620)
        radius: 16
        color: "#161524"
        border.color: "#18ffffff"
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 20
            spacing: 12

            // Header
            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                ColumnLayout {
                    spacing: 2
                    Text {
                        text: questionsModalRoot.battery ? questionsModalRoot.battery.title : "Questões da Bateria"
                        color: "#fffffe"
                        font.pixelSize: 18
                        font.bold: true
                        elide: Text.ElideRight
                        Layout.maximumWidth: 500
                    }
                    Text {
                        text: (questionsModalRoot.questions ? questionsModalRoot.questions.length : 0) + " questão(ões) cadastrada(s)"
                        color: "#a7a9be"
                        font.pixelSize: 12
                    }
                }

                Item { Layout.fillWidth: true }

                // "⚡ Modo Foco" Button
                Rectangle {
                    Layout.preferredWidth: 110
                    Layout.preferredHeight: 36
                    radius: 8
                    color: focusBtnMouse.containsMouse ? "#059669" : "#10b981"

                    RowLayout {
                        anchors.centerIn: parent; spacing: 4
                        Text { text: "⚡"; color: "#ffffff"; font.pixelSize: 13 }
                        Text { text: "Modo Foco"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                    }

                    MouseArea {
                        id: focusBtnMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: questionsModalRoot.requestSequentialMode(questionsModalRoot.battery)
                    }
                }

                // "✨ Gerar IA" Button
                Rectangle {
                    Layout.preferredWidth: 100
                    Layout.preferredHeight: 36
                    radius: 8
                    color: aiBtnMouse.containsMouse ? "#7c3aed" : "#8b5cf6"

                    RowLayout {
                        anchors.centerIn: parent; spacing: 4
                        Text { text: "✨"; color: "#ffffff"; font.pixelSize: 13 }
                        Text { text: "Gerar IA"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                    }

                    MouseArea {
                        id: aiBtnMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: questionsModalRoot.requestAIGeneration(questionsModalRoot.battery)
                    }
                }

                // "📄 Importar" Button
                Rectangle {
                    Layout.preferredWidth: 96
                    Layout.preferredHeight: 36
                    radius: 8
                    color: importBtnMouse.containsMouse ? "#2563eb" : "#3b82f6"

                    RowLayout {
                        anchors.centerIn: parent; spacing: 4
                        Text { text: "📄"; color: "#ffffff"; font.pixelSize: 13 }
                        Text { text: "Importar"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                    }

                    MouseArea {
                        id: importBtnMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: questionsModalRoot.requestImport(questionsModalRoot.battery)
                    }
                }

                // "+ Nova Questão" Button
                Rectangle {
                    Layout.preferredWidth: 136
                    Layout.preferredHeight: 36
                    radius: 8
                    color: addQMouse.containsMouse ? "#4f46e5" : "#6366f1"

                    RowLayout {
                        anchors.centerIn: parent; spacing: 6
                        Text { text: "+"; color: "#ffffff"; font.pixelSize: 16; font.bold: true }
                        Text { text: "Nova Questão"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                    }

                    MouseArea {
                        id: addQMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: questionsModalRoot.requestAddQuestion(questionsModalRoot.battery)
                    }
                }

                // Close Button
                Rectangle {
                    Layout.preferredWidth: 32
                    Layout.preferredHeight: 32
                    radius: 8
                    color: closeQMouse.containsMouse ? "#20ffffff" : "#10ffffff"
                    Text { anchors.centerIn: parent; text: "✕"; color: "#a7a9be"; font.pixelSize: 14 }
                    MouseArea {
                        id: closeQMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: questionsModalRoot.closed()
                    }
                }
            }

            // Questions List
            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                radius: 10
                color: "#0f0e17"
                border.color: "#0fffffff"
                clip: true

                ListView {
                    id: questionsList
                    anchors.fill: parent
                    anchors.margins: 8
                    spacing: 8
                    model: questionsModalRoot.questions

                    delegate: Rectangle {
                        id: qItemRect
                        property var qData: modelData
                        width: questionsList.width
                        height: qContentLayout.implicitHeight + 20
                        radius: 8
                        color: "#1a1924"
                        border.color: "#0affffff"

                        ColumnLayout {
                            id: qContentLayout
                            anchors.fill: parent
                            anchors.margins: 12
                            spacing: 8

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8

                                Rectangle {
                                    Layout.preferredWidth: 26
                                    Layout.preferredHeight: 20
                                    radius: 4
                                    color: "#206366f1"
                                    Text {
                                        anchors.centerIn: parent
                                        text: "#" + (index + 1)
                                        color: "#818cf8"
                                        font.pixelSize: 10
                                        font.bold: true
                                    }
                                }

                                Text {
                                    Layout.fillWidth: true
                                    text: qItemRect.qData ? (qItemRect.qData.question || "") : ""
                                    color: "#fffffe"
                                    font.pixelSize: 13
                                    font.bold: true
                                    wrapMode: Text.Wrap
                                }

                                // Edit Button
                                Rectangle {
                                    Layout.preferredWidth: 28
                                    Layout.preferredHeight: 28
                                    radius: 6
                                    color: editQMouse.containsMouse ? "#206366f1" : "#106366f1"

                                    Text { anchors.centerIn: parent; text: "✏️"; font.pixelSize: 11 }

                                    MouseArea {
                                        id: editQMouse
                                        anchors.fill: parent
                                        hoverEnabled: true
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: questionsModalRoot.requestEditQuestion(qItemRect.qData)
                                    }
                                }

                                // Delete Button
                                Rectangle {
                                    Layout.preferredWidth: 28
                                    Layout.preferredHeight: 28
                                    radius: 6
                                    color: delQMouse.containsMouse ? "#30f43f5e" : "#1af43f5e"

                                    Text { anchors.centerIn: parent; text: "🗑️"; font.pixelSize: 11 }

                                    MouseArea {
                                        id: delQMouse
                                        anchors.fill: parent
                                        hoverEnabled: true
                                        cursorShape: Qt.PointingHandCursor
                                        onClicked: questionsModalRoot.requestDeleteQuestion(qItemRect.qData ? qItemRect.qData.id : "")
                                    }
                                }
                            }

                            // Options preview
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 6

                                readonly property var parsedOptions: {
                                    if (!qItemRect.qData || !qItemRect.qData.options) return []
                                    try {
                                        return JSON.parse(qItemRect.qData.options)
                                    } catch (e) {
                                        return []
                                    }
                                }

                                Repeater {
                                    model: parent.parsedOptions
                                    delegate: Rectangle {
                                        readonly property bool isCorrect: qItemRect.qData ? (index === qItemRect.qData.correct_index) : false
                                        Layout.preferredHeight: 22
                                        Layout.preferredWidth: optLabel.contentWidth + 12
                                        radius: 4
                                        color: isCorrect ? "#2010b981" : "#10ffffff"
                                        border.color: isCorrect ? "#4010b981" : "#08ffffff"
                                        border.width: 1

                                        Text {
                                            id: optLabel
                                            anchors.centerIn: parent
                                            text: (isCorrect ? "✓ " : "") + String.fromCharCode(65 + index) + ": " + modelData
                                            color: isCorrect ? "#34d399" : "#a7a9be"
                                            font.pixelSize: 10
                                            font.bold: isCorrect
                                            elide: Text.ElideRight
                                        }
                                    }
                                }
                                Item { Layout.fillWidth: true }
                            }

                            // Explanation & Tags
                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 8
                                visible: qItemRect.qData ? ((qItemRect.qData.explanation && qItemRect.qData.explanation.length > 0) || (qItemRect.qData.tags && qItemRect.qData.tags.length > 0)) : false

                                Text {
                                    visible: qItemRect.qData && qItemRect.qData.explanation && qItemRect.qData.explanation.length > 0
                                    Layout.fillWidth: true
                                    text: "💡 " + (qItemRect.qData ? (qItemRect.qData.explanation || "") : "")
                                    color: "#94a3b8"
                                    font.pixelSize: 11
                                    elide: Text.ElideRight
                                }

                                Text {
                                    visible: qItemRect.qData && qItemRect.qData.tags && qItemRect.qData.tags.length > 0
                                    text: qItemRect.qData ? (qItemRect.qData.tags || "") : ""
                                    color: "#818cf8"
                                    font.pixelSize: 10
                                }
                            }
                        }
                    }

                    // Empty placeholder
                    Text {
                        anchors.centerIn: parent
                        visible: !questionsModalRoot.questions || questionsModalRoot.questions.length === 0
                        text: "Nenhuma questão cadastrada nesta bateria ainda.\nClique em '+ Nova Questão' acima para começar."
                        color: "#64748b"
                        font.pixelSize: 13
                        horizontalAlignment: Text.AlignHCenter
                    }
                }
            }
        }
    }
}
