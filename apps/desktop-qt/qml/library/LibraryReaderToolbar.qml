import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: toolbar
    Layout.fillWidth: true
    Layout.preferredHeight: 64
    radius: 12
    color: "#171620"
    border.color: "#12ffffff"

    property var book: null
    property int currentPage: 1
    property int totalPages: 0
    property string format: ""
    property bool busy: false

    signal backRequested()
    signal previousRequested()
    signal nextRequested()
    signal searchRequested()
    signal typographyRequested()
    signal bookmarkRequested()
    signal zoomInRequested()
    signal zoomOutRequested()
    signal fitWidthRequested()
    signal pageJumpRequested(int page)

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 16
        anchors.rightMargin: 16
        spacing: 12

        Button {
            text: "‹ Biblioteca"
            onClicked: toolbar.backRequested()
            background: Rectangle { color: "#242331"; radius: 8; border.color: "#18ffffff" }
            contentItem: Text { text: parent.text; color: "#d4d4dc"; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
        }

        ColumnLayout {
            Layout.fillWidth: true
            spacing: 2
            Text {
                Layout.fillWidth: true
                text: toolbar.book ? toolbar.book.title : "Leitor nativo"
                color: "#fffffe"
                font.pixelSize: 15
                font.bold: true
                elide: Text.ElideRight
            }
            Text {
                text: toolbar.book ? (toolbar.book.author || "Autor desconhecido") : ""
                color: "#9293a5"
                font.pixelSize: 11
                elide: Text.ElideRight
            }
        }

        Text { text: toolbar.format.toUpperCase(); color: "#a78bfa"; font.pixelSize: 11; font.bold: true }

        Button {
            text: "◀"
            enabled: !toolbar.busy && toolbar.currentPage > 1
            onClicked: toolbar.previousRequested()
            background: Rectangle { color: parent.enabled ? "#242331" : "#191823"; radius: 7 }
            contentItem: Text { text: parent.text; color: parent.enabled ? "#d4d4dc" : "#595968"; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
        }

        RowLayout {
            spacing: 4
            TextField {
                id: pageInput
                text: "" + toolbar.currentPage
                Layout.preferredWidth: 42
                Layout.preferredHeight: 28
                horizontalAlignment: TextInput.AlignHCenter
                font.pixelSize: 12
                color: "#fffffe"
                background: Rectangle {
                    color: "#242331"
                    radius: 6
                    border.color: pageInput.activeFocus ? "#8b5cf6" : "#20ffffff"
                }
                onAccepted: {
                    var p = parseInt(text, 10)
                    if (!isNaN(p) && p >= 1 && p <= toolbar.totalPages) {
                        toolbar.pageJumpRequested(p)
                    } else {
                        text = "" + toolbar.currentPage
                    }
                }
            }
            Text {
                text: "/ " + (toolbar.totalPages > 0 ? toolbar.totalPages : "—")
                color: "#c4c5d4"
                font.pixelSize: 12
            }
        }

        Button {
            text: "▶"
            enabled: !toolbar.busy && toolbar.currentPage < toolbar.totalPages
            onClicked: toolbar.nextRequested()
            background: Rectangle { color: parent.enabled ? "#242331" : "#191823"; radius: 7 }
            contentItem: Text { text: parent.text; color: parent.enabled ? "#d4d4dc" : "#595968"; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
        }

        // Zoom Controls
        Button {
            text: "-"
            Accessible.name: "Zoom out"
            ToolTip.visible: hovered
            ToolTip.text: "Reduzir zoom"
            enabled: !toolbar.busy
            onClicked: toolbar.zoomOutRequested()
            background: Rectangle { color: parent.enabled ? "#242331" : "#191823"; radius: 7 }
            contentItem: Text { text: parent.text; color: parent.enabled ? "#d4d4dc" : "#595968"; font.pixelSize: 15; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
        }

        Button {
            text: "+"
            Accessible.name: "Zoom in"
            ToolTip.visible: hovered
            ToolTip.text: "Aumentar zoom"
            enabled: !toolbar.busy
            onClicked: toolbar.zoomInRequested()
            background: Rectangle { color: parent.enabled ? "#242331" : "#191823"; radius: 7 }
            contentItem: Text { text: parent.text; color: parent.enabled ? "#d4d4dc" : "#595968"; font.pixelSize: 15; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
        }

        Button {
            text: "⤢"
            Accessible.name: "Fit width"
            ToolTip.visible: hovered
            ToolTip.text: "Ajustar largura"
            enabled: !toolbar.busy
            onClicked: toolbar.fitWidthRequested()
            background: Rectangle { color: parent.enabled ? "#242331" : "#191823"; radius: 7 }
            contentItem: Text { text: parent.text; color: parent.enabled ? "#d4d4dc" : "#595968"; font.pixelSize: 14; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
        }

        Button {
            text: "⌕"
            Accessible.name: "Search in book"
            ToolTip.visible: hovered
            ToolTip.text: "Find in book"
            enabled: !toolbar.busy && toolbar.totalPages > 0
            onClicked: toolbar.searchRequested()
            background: Rectangle { color: parent.enabled ? "#242331" : "#191823"; radius: 7 }
            contentItem: Text { text: parent.text; color: parent.enabled ? "#d4d4dc" : "#595968"; font.pixelSize: 18; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
        }

        Button {
            text: "Aa"
            Accessible.name: "Tipografia e tema"
            ToolTip.visible: hovered
            ToolTip.text: "Tipografia e tema"
            enabled: !toolbar.busy && toolbar.totalPages > 0
            onClicked: toolbar.typographyRequested()
            background: Rectangle { color: parent.enabled ? "#242331" : "#191823"; radius: 7 }
            contentItem: Text { text: parent.text; color: parent.enabled ? "#a78bfa" : "#595968"; font.pixelSize: 14; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
        }

        Button {
            text: "Salvar marcador"
            enabled: !toolbar.busy && toolbar.totalPages > 0
            onClicked: toolbar.bookmarkRequested()
            background: Rectangle { color: "#3e315e"; radius: 8; border.color: "#378b5cf6" }
            contentItem: Text { text: parent.text; color: "#ddd6fe"; font.pixelSize: 11; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
        }
    }
}
