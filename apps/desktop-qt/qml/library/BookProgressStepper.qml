import QtQuick 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: stepperRoot
    Layout.fillWidth: true
    spacing: 12

    property int currentPage: 0
    property int totalPages: 0

    signal pageChanged(int page)

    onCurrentPageChanged: {
        if (pageInput.text !== currentPage.toString()) {
            pageInput.text = currentPage.toString()
        }
    }

    Text {
        text: "Ajustar Página Atual"
        color: "#fffffe"
        font.pixelSize: 13
        font.bold: true
    }

    RowLayout {
        Layout.fillWidth: true
        spacing: 8

        // -5 Button
        Rectangle {
            width: 50; height: 38; radius: 8; color: "#211f30"; border.color: "#ffffff12"
            Text { anchors.centerIn: parent; text: "-5"; color: "#fffffe"; font.pixelSize: 12; font.bold: true }
            MouseArea {
                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                onClicked: {
                    stepperRoot.pageChanged(Math.max(0, stepperRoot.currentPage - 5))
                }
            }
        }

        // -1 Button
        Rectangle {
            width: 50; height: 38; radius: 8; color: "#211f30"; border.color: "#ffffff12"
            Text { anchors.centerIn: parent; text: "-1"; color: "#fffffe"; font.pixelSize: 12; font.bold: true }
            MouseArea {
                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                onClicked: {
                    stepperRoot.pageChanged(Math.max(0, stepperRoot.currentPage - 1))
                }
            }
        }

        // Direct Numeric Input
        Rectangle {
            Layout.fillWidth: true
            height: 38
            radius: 8
            color: "#15141b"
            border.color: pageInput.activeFocus ? "#7c3aed" : "#ffffff15"
            TextInput {
                id: pageInput
                anchors.centerIn: parent
                text: stepperRoot.currentPage.toString()
                color: "#fffffe"
                font.pixelSize: 14
                font.bold: true
                selectByMouse: true
                onTextChanged: {
                    var val = parseInt(text)
                    if (!isNaN(val) && val !== stepperRoot.currentPage) {
                        stepperRoot.pageChanged(Math.max(0, val))
                    }
                }
            }
        }

        // +1 Button
        Rectangle {
            width: 50; height: 38; radius: 8; color: "#211f30"; border.color: "#ffffff12"
            Text { anchors.centerIn: parent; text: "+1"; color: "#fffffe"; font.pixelSize: 12; font.bold: true }
            MouseArea {
                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                onClicked: {
                    stepperRoot.pageChanged(Math.min(stepperRoot.totalPages, stepperRoot.currentPage + 1))
                }
            }
        }

        // +5 Button
        Rectangle {
            width: 50; height: 38; radius: 8; color: "#211f30"; border.color: "#ffffff12"
            Text { anchors.centerIn: parent; text: "+5"; color: "#fffffe"; font.pixelSize: 12; font.bold: true }
            MouseArea {
                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                onClicked: {
                    stepperRoot.pageChanged(Math.min(stepperRoot.totalPages, stepperRoot.currentPage + 5))
                }
            }
        }

        // +10 Button
        Rectangle {
            width: 50; height: 38; radius: 8; color: "#211f30"; border.color: "#ffffff12"
            Text { anchors.centerIn: parent; text: "+10"; color: "#fffffe"; font.pixelSize: 12; font.bold: true }
            MouseArea {
                anchors.fill: parent; cursorShape: Qt.PointingHandCursor
                onClicked: {
                    stepperRoot.pageChanged(Math.min(stepperRoot.totalPages, stepperRoot.currentPage + 10))
                }
            }
        }
    }

    // Quick Toggle: Concluído
    Rectangle {
        Layout.fillWidth: true
        height: 38
        radius: 8
        color: stepperRoot.currentPage >= stepperRoot.totalPages ? "#10b98126" : "#211f30"
        border.color: stepperRoot.currentPage >= stepperRoot.totalPages ? "#10b981" : "#ffffff12"

        RowLayout {
            anchors.centerIn: parent
            spacing: 8
            Text {
                text: stepperRoot.currentPage >= stepperRoot.totalPages ? "✓" : "○"
                color: stepperRoot.currentPage >= stepperRoot.totalPages ? "#10b981" : "#a7a9be"
                font.pixelSize: 14
            }
            Text {
                text: stepperRoot.currentPage >= stepperRoot.totalPages ? "Leitura Concluída" : "Marcar como Totalmente Lido"
                color: stepperRoot.currentPage >= stepperRoot.totalPages ? "#34d399" : "#fffffe"
                font.pixelSize: 12
                font.bold: true
            }
        }

        MouseArea {
            anchors.fill: parent
            cursorShape: Qt.PointingHandCursor
            onClicked: {
                if (stepperRoot.currentPage >= stepperRoot.totalPages) {
                    stepperRoot.pageChanged(0)
                } else {
                    stepperRoot.pageChanged(stepperRoot.totalPages)
                }
            }
        }
    }
}
