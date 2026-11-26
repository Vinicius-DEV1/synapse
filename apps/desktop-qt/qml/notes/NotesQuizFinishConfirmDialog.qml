import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Dialog {
    id: finishDialog
    objectName: "notesQuizFinishConfirmDialog"
    parent: Overlay.overlay
    anchors.centerIn: parent
    width: Math.min(parent ? parent.width - 32 : 400, 400)
    modal: true
    focus: true
    padding: 24
    closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
    standardButtons: Dialog.NoButton
    Overlay.modal: Rectangle { color: "#b3000000" }

    property int total: 0
    property int answeredCount: 0
    property bool acceptedClose: false
    readonly property int pendingCount: Math.max(0, total - answeredCount)
    readonly property bool allAnswered: total > 0 && answeredCount >= total
    readonly property string statusText: allAnswered
        ? qsTr("Todas as %1 questões respondidas").arg(total)
        : qsTr("%1 de %2 questões respondidas (%3 pendente%4)")
            .arg(answeredCount).arg(total).arg(pendingCount).arg(pendingCount === 1 ? "" : "s")

    signal confirmed()
    signal cancelled()

    background: Rectangle {
        color: "#161524"
        border.color: "#1affffff"
        radius: 16
    }

    contentItem: ColumnLayout {
        spacing: 16

        Rectangle {
            Layout.alignment: Qt.AlignHCenter
            Layout.preferredWidth: 48
            Layout.preferredHeight: 48
            radius: 16
            color: "#0affffff"
            border.color: "#14ffffff"
            AppIcon {
                anchors.centerIn: parent
                name: "trophy"
                color: "#fcd34d"
                width: 24
                height: 24
            }
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: 6

            Label {
                Layout.fillWidth: true
                text: qsTr("Bateria Concluída!")
                color: "#ffffff"
                font.pixelSize: 18
                font.weight: Font.DemiBold
                horizontalAlignment: Text.AlignHCenter
            }

            Text {
                Layout.fillWidth: true
                text: qsTr("Você chegou à última questão. Deseja finalizar a bateria e ver seu resumo de desempenho?")
                color: "#a7a9be"
                font.pixelSize: 12
                wrapMode: Text.Wrap
                horizontalAlignment: Text.AlignHCenter
            }
        }

        Rectangle {
            Layout.alignment: Qt.AlignHCenter
            implicitWidth: statusLabel.implicitWidth + 24
            implicitHeight: 28
            radius: 14
            color: finishDialog.allAnswered ? "#1a10b981" : "#1af59e0b"
            border.color: finishDialog.allAnswered ? "#3310b981" : "#33f59e0b"

            RowLayout {
                id: statusRow
                anchors.centerIn: parent
                spacing: 6

                AppIcon {
                    name: finishDialog.allAnswered ? "check-circle" : "alert-circle"
                    color: finishDialog.allAnswered ? "#6ee7b7" : "#fcd34d"
                    Layout.preferredWidth: 12
                    Layout.preferredHeight: 12
                }

                Label {
                    id: statusLabel
                    text: finishDialog.statusText
                    color: finishDialog.allAnswered ? "#6ee7b7" : "#fcd34d"
                    font.pixelSize: 11
                    font.weight: Font.Medium
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 1
            color: "#0fffffff"
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: 10

            Button {
                id: reviewButton
                objectName: "notesQuizFinishReviewButton"
                Layout.fillWidth: true
                Layout.preferredHeight: 36
                text: qsTr("Revisar")
                onClicked: finishDialog.reject()
                background: Rectangle {
                    radius: 8
                    color: reviewButton.hovered ? "#1affffff" : "#0dffffff"
                    border.color: "#1affffff"
                }
                contentItem: RowLayout {
                    spacing: 6
                    Item { Layout.fillWidth: true }
                    Label { text: reviewButton.text; color: "#a7a9be"; font.pixelSize: 12; font.weight: Font.Medium }
                    Label {
                        text: "Esc"
                        color: "#99a7a9be"
                        font.pixelSize: 10
                        padding: 3
                        background: Rectangle { radius: 4; color: "#0dffffff"; border.color: "#1affffff" }
                    }
                    Item { Layout.fillWidth: true }
                }
            }

            Button {
                id: finishButton
                objectName: "notesQuizFinishConfirmButton"
                Layout.fillWidth: true
                Layout.preferredHeight: 36
                text: qsTr("Finalizar")
                onClicked: finishDialog.accept()
                background: Rectangle {
                    radius: 8
                    color: finishButton.hovered ? "#7c3aed" : "#8b5cf6"
                }
                contentItem: RowLayout {
                    spacing: 6
                    Item { Layout.fillWidth: true }
                    Label { text: finishButton.text; color: "#ffffff"; font.pixelSize: 12; font.weight: Font.DemiBold }
                    Label {
                        text: "Enter"
                        color: "#ccffffff"
                        font.pixelSize: 10
                        padding: 3
                        background: Rectangle { radius: 4; color: "#33000000"; border.color: "#33ffffff" }
                    }
                    Item { Layout.fillWidth: true }
                }
            }
        }
    }

    onOpened: finishButton.forceActiveFocus()
    onAccepted: {
        acceptedClose = true
        finishDialog.confirmed()
    }
    onClosed: {
        if (!acceptedClose) finishDialog.cancelled()
        acceptedClose = false
    }
}
