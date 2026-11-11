import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Dialog {
    id: deleteDialog
    property string itemKind: ""

    signal confirmed()

    title: itemKind === "bookmark" ? "Excluir marcador?"
         : itemKind === "allHighlights" ? "Restaurar PDF original?" : "Excluir destaque?"
    modal: true
    anchors.centerIn: parent
    width: 360
    standardButtons: Dialog.NoButton
    background: Rectangle { color: "#171620"; border.color: "#24ffffff"; radius: 12 }
    contentItem: Text {
        text: deleteDialog.itemKind === "allHighlights"
              ? "Todos os destaques deste PDF serão removidos. Os marcadores de página serão mantidos."
              : "Este item será removido da lista de anotações deste livro."
        color: "#c4c5d4"
        wrapMode: Text.Wrap
        padding: 18
    }
    footer: RowLayout {
        spacing: 8
        Item { Layout.fillWidth: true }
        Button {
            text: "Cancelar"
            onClicked: deleteDialog.reject()
            background: Rectangle { color: "#201f2c"; border.color: "#20ffffff"; radius: 7 }
            contentItem: Text { text: parent.text; color: "#c4c5d4"; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
        }
        Button {
            text: "Excluir"
            onClicked: deleteDialog.accept()
            background: Rectangle { color: "#9f2941"; radius: 7 }
            contentItem: Text { text: parent.text; color: "white"; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
        }
    }
    onAccepted: deleteDialog.confirmed()
}
