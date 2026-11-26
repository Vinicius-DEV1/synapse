import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Dialog {
    id: deleteDialog
    objectName: "notesQuestionBlockDeleteDialog"
    parent: Overlay.overlay
    anchors.centerIn: parent
    width: Math.min(parent ? parent.width - 32 : 384, 384)
    modal: true
    focus: true
    padding: 20
    closePolicy: Popup.CloseOnEscape
    standardButtons: Dialog.NoButton
    Overlay.modal: Rectangle { color: "#99000000" }

    signal confirmed()

    background: Rectangle {
        color: "#161524"
        border.color: "#1affffff"
        radius: 16
    }

    contentItem: ColumnLayout {
        spacing: 16

        Label {
            Layout.fillWidth: true
            text: qsTr("Remover Bloco de Questões?")
            color: "#f4f4f5"
            font.pixelSize: 14
            font.weight: Font.DemiBold
        }

        Text {
            Layout.fillWidth: true
            textFormat: Text.RichText
            text: qsTr("O card será removido desta nota. A bateria e suas questões <b>continuarão salvas no banco de dados</b> e acessíveis no Módulo de Questões.")
            color: "#a1a1aa"
            font.pixelSize: 12
            wrapMode: Text.Wrap
            lineHeight: 19.5
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: 8
            Item { Layout.fillWidth: true }

            Button {
                id: cancelButton
                objectName: "notesQuestionBlockDeleteCancelButton"
                Layout.preferredHeight: 30
                text: qsTr("Cancelar")
                onClicked: deleteDialog.reject()
                background: Rectangle {
                    radius: 8
                    color: cancelButton.hovered ? "#1affffff" : "#0dffffff"
                }
                contentItem: Text {
                    text: cancelButton.text
                    color: "#d4d4d8"
                    font.pixelSize: 12
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }

            Button {
                id: confirmButton
                objectName: "notesQuestionBlockDeleteConfirmButton"
                Layout.preferredHeight: 30
                text: qsTr("Remover da Nota")
                onClicked: deleteDialog.accept()
                background: Rectangle {
                    radius: 8
                    color: confirmButton.hovered ? "#f43f5e" : "#e11d48"
                }
                contentItem: Text {
                    text: confirmButton.text
                    color: "#ffffff"
                    font.pixelSize: 12
                    font.weight: Font.Medium
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }
        }
    }

    onOpened: cancelButton.forceActiveFocus()
    onAccepted: deleteDialog.confirmed()
}
