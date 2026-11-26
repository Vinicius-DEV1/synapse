pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Dialog {
    id: deleteDialogRoot
    anchors.centerIn: parent
    width: Math.min(parent.width - 32, 460)
    modal: true
    focus: true
    padding: 18
    closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
    standardButtons: Dialog.NoButton

    property string bundleTitle: ""
    property string errorMessage: ""
    property int itemCount: 0
    property bool itemsInvalid: false
    property bool isOpen: false

    signal ungroupRequested()
    signal unlinkRequested()
    signal dismissed()

    onIsOpenChanged: {
        if (isOpen) open()
        else close()
    }
    onClosed: dismissed()

    background: Rectangle {
        color: "#16151f"
        radius: 14
        border.color: "#22ffffff"
        border.width: 1
    }

    contentItem: ColumnLayout {
        spacing: 14

        Text {
            Layout.fillWidth: true
            text: qsTr("Remover agrupamento")
            color: "#fffffe"
            font.pixelSize: 15
            font.bold: true
        }

        Text {
            Layout.fillWidth: true
            text: qsTr("Como deseja tratar ‘%1’ (%2 arquivo(s))?")
                .arg(deleteDialogRoot.bundleTitle || qsTr("Documentos"))
                .arg(deleteDialogRoot.itemCount)
            color: "#c4c5d4"
            font.pixelSize: 12
            wrapMode: Text.Wrap
        }

        Text {
            Layout.fillWidth: true
            visible: deleteDialogRoot.errorMessage.length > 0
            text: deleteDialogRoot.errorMessage
            color: "#fda4af"
            font.pixelSize: 11
            wrapMode: Text.Wrap
        }

        Button {
            id: ungroupButton
            Layout.fillWidth: true
            Layout.preferredHeight: 56
            enabled: !deleteDialogRoot.itemsInvalid && deleteDialogRoot.itemCount > 0
            Accessible.name: qsTr("Desagrupar arquivos e mantê-los nesta página")
            onClicked: deleteDialogRoot.ungroupRequested()
            background: Rectangle {
                radius: 9
                color: ungroupButton.enabled ? (ungroupButton.hovered ? "#252435" : "#1d1c28") : "#17161f"
                border.color: ungroupButton.enabled ? "#22ffffff" : "#12ffffff"
            }
            contentItem: ColumnLayout {
                spacing: 3
                Text {
                    text: qsTr("Desagrupar na página")
                    color: ungroupButton.enabled ? "#fffffe" : "#71717a"
                    font.pixelSize: 12
                    font.bold: true
                }
                Text {
                    text: qsTr("Mantém os arquivos soltos no texto.")
                    color: "#a7a9be"
                    font.pixelSize: 10
                }
            }
        }

        Button {
            id: unlinkButton
            Layout.fillWidth: true
            Layout.preferredHeight: 56
            Accessible.name: qsTr("Desvincular o agrupamento desta página e manter os arquivos")
            onClicked: deleteDialogRoot.unlinkRequested()
            background: Rectangle {
                radius: 9
                color: unlinkButton.hovered ? "#252435" : "#1d1c28"
                border.color: "#22ffffff"
            }
            contentItem: ColumnLayout {
                spacing: 3
                Text {
                    text: qsTr("Desvincular da página")
                    color: "#fffffe"
                    font.pixelSize: 12
                    font.bold: true
                }
                Text {
                    text: qsTr("Remove o widget e mantém os arquivos no sistema.")
                    color: "#a7a9be"
                    font.pixelSize: 10
                }
            }
        }

        Button {
            id: cancelButton
            Layout.alignment: Qt.AlignRight
            text: qsTr("Cancelar")
            Accessible.name: qsTr("Cancelar a remoção do agrupamento")
            onClicked: deleteDialogRoot.close()
            background: Rectangle {
                radius: 7
                color: cancelButton.hovered ? "#252435" : "transparent"
                border.color: "#20ffffff"
            }
            contentItem: Text {
                text: cancelButton.text
                color: "#c4c5d4"
                font.pixelSize: 11
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
            }
        }
    }
}
