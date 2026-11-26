import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Dialog {
    id: conflictRoot
    parent: Overlay.overlay
    anchors.centerIn: parent
    width: Math.min(parent ? parent.width - 32 : 460, 460)
    modal: true
    focus: true
    padding: 18
    closePolicy: Popup.NoAutoClose
    standardButtons: Dialog.NoButton

    property bool isOpen: false
    property string errorMessage: ""

    signal keepLocalRequested()
    signal reloadSavedRequested()

    onIsOpenChanged: {
        if (isOpen) open()
        else close()
    }

    background: Rectangle {
        color: "#16151f"
        radius: 14
        border.color: "#22ffffff"
        border.width: 1
    }

    contentItem: ColumnLayout {
        spacing: 12

        Text {
            Layout.fillWidth: true
            text: qsTr("Esta nota foi alterada em outro lugar")
            color: "#fffffe"
            font.pixelSize: 15
            font.bold: true
            wrapMode: Text.Wrap
        }

        Text {
            Layout.fillWidth: true
            text: qsTr("Suas alterações locais continuam abertas. Escolha qual versão deve ficar salva.")
            color: "#c4c5d4"
            font.pixelSize: 12
            wrapMode: Text.Wrap
        }

        Text {
            Layout.fillWidth: true
            visible: conflictRoot.errorMessage.length > 0
            text: conflictRoot.errorMessage
            color: "#fda4af"
            font.pixelSize: 11
            wrapMode: Text.Wrap
        }

        Button {
            id: keepLocalButton
            Layout.fillWidth: true
            Layout.preferredHeight: 58
            text: qsTr("Manter minhas alterações")
            Accessible.name: qsTr("Salvar esta versão local por cima da versão salva")
            onClicked: conflictRoot.keepLocalRequested()
            background: Rectangle {
                radius: 8
                color: keepLocalButton.hovered ? "#252435" : "#1d1c28"
                border.color: "#22ffffff"
            }
            contentItem: ColumnLayout {
                spacing: 2
                Text {
                    text: keepLocalButton.text
                    color: "#fffffe"
                    font.pixelSize: 11
                    font.bold: true
                }
                Text {
                    text: qsTr("Substitui a versão salva pelo conteúdo que está aberto agora.")
                    color: "#a7a9be"
                    font.pixelSize: 9
                    wrapMode: Text.Wrap
                }
            }
        }

        Button {
            id: reloadSavedButton
            Layout.fillWidth: true
            Layout.preferredHeight: 58
            text: qsTr("Carregar versão salva")
            Accessible.name: qsTr("Descartar alterações locais e carregar a versão salva")
            onClicked: conflictRoot.reloadSavedRequested()
            background: Rectangle {
                radius: 8
                color: reloadSavedButton.hovered ? "#252435" : "#1d1c28"
                border.color: "#22ffffff"
            }
            contentItem: ColumnLayout {
                spacing: 2
                Text {
                    text: reloadSavedButton.text
                    color: "#fffffe"
                    font.pixelSize: 11
                    font.bold: true
                }
                Text {
                    text: qsTr("Descarta as alterações locais desta sessão.")
                    color: "#a7a9be"
                    font.pixelSize: 9
                    wrapMode: Text.Wrap
                }
            }
        }
    }
}
