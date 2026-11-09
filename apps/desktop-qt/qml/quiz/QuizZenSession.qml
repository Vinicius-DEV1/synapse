import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: zenSessionRoot
    anchors.fill: parent
    visible: isActive

    property bool isActive: false
    property var activeBattery: null
    property var currentQuestion: null
    property int currentIndex: 0
    property int totalQuestions: 0
    property int selectedOption: -1
    property bool isConfirmed: false
    property bool showExplanation: false

    signal exitRequested()
    signal optionSelected(int index)
    signal gabaritoToggled()
    signal actionRequested()

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
                text: (zenSessionRoot.activeBattery ? zenSessionRoot.activeBattery.title : "Simulado Geral") + " • Zen Focus"
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
                    onClicked: zenSessionRoot.exitRequested()
                }
            }

            // Progress "01 / 10"
            Text {
                text: (zenSessionRoot.currentIndex + 1 < 10 ? "0" : "") + (zenSessionRoot.currentIndex + 1) + " / " + (zenSessionRoot.totalQuestions < 10 ? "0" : "") + zenSessionRoot.totalQuestions
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
            width: parent.width * ((zenSessionRoot.currentIndex + (zenSessionRoot.isConfirmed ? 1 : 0.2)) / Math.max(1, zenSessionRoot.totalQuestions))
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
                text: zenSessionRoot.currentQuestion ? (zenSessionRoot.currentQuestion.prompt || "") : ""
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
                    model: zenSessionRoot.currentQuestion ? zenSessionRoot.currentQuestion.options : []
                    delegate: Rectangle {
                        id: optionBox
                        Layout.fillWidth: true
                        implicitHeight: optText.implicitHeight + 28
                        radius: 8

                        property int optionIdx: index
                        property bool isSelected: zenSessionRoot.selectedOption === optionIdx
                        property bool isCorrect: zenSessionRoot.currentQuestion && optionIdx === zenSessionRoot.currentQuestion.correctIndex

                        color: {
                            if (!zenSessionRoot.isConfirmed) {
                                return isSelected ? "#27272a" : (optMouse.containsMouse ? "#1c1b2e" : "#161524")
                            }
                            if (isCorrect) return "#10b98118"
                            if (isSelected && !isCorrect) return "#f43f5e18"
                            return "#161524"
                        }

                        border.color: {
                            if (!zenSessionRoot.isConfirmed) {
                                return isSelected ? "#6366f1" : (optMouse.containsMouse ? "#ffffff20" : "#ffffff0d")
                            }
                            if (isCorrect) return "#10b98150"
                            if (isSelected && !isCorrect) return "#f43f5e50"
                            return "#ffffff08"
                        }
                        border.width: isSelected || (zenSessionRoot.isConfirmed && isCorrect) ? 1.5 : 1

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
                                    if (!zenSessionRoot.isConfirmed) {
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
                                    if (!zenSessionRoot.isConfirmed) {
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
                            hoverEnabled: !zenSessionRoot.isConfirmed
                            cursorShape: zenSessionRoot.isConfirmed ? Qt.ArrowCursor : Qt.PointingHandCursor
                            onClicked: zenSessionRoot.optionSelected(optionIdx)
                        }
                    }
                }
            }

            // Gabarito / Explanation Expandable Drawer
            Rectangle {
                Layout.fillWidth: true
                visible: zenSessionRoot.isConfirmed && zenSessionRoot.showExplanation
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
                        text: zenSessionRoot.currentQuestion ? (zenSessionRoot.currentQuestion.explanation || "") : ""
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
                Text { text: "[G] Gabarito"; color: "#71717a"; font.pixelSize: 12; visible: zenSessionRoot.isConfirmed }
            }

            Item { Layout.fillWidth: true }

            // Gabarito Toggle Button
            Button {
                visible: zenSessionRoot.isConfirmed
                implicitHeight: 36
                text: zenSessionRoot.showExplanation ? "Ocultar Gabarito" : "Ver Gabarito [G]"
                onClicked: zenSessionRoot.gabaritoToggled()
            }

            // Main Action Button
            Rectangle {
                implicitHeight: 38
                implicitWidth: 140
                radius: 6
                color: zenSessionRoot.selectedOption === -1 ? "#27272a" : "#6366f1"

                Text {
                    anchors.centerIn: parent
                    text: !zenSessionRoot.isConfirmed ? "Confirmar [↵]" : (zenSessionRoot.currentIndex < zenSessionRoot.totalQuestions - 1 ? "Próxima [↵]" : "Concluir [↵]")
                    color: zenSessionRoot.selectedOption === -1 ? "#71717a" : "#ffffff"
                    font.pixelSize: 13
                    font.bold: true
                }

                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: zenSessionRoot.actionRequested()
                }
            }
        }
    }
}
