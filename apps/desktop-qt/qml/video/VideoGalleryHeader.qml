import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: headerRoot
    Layout.fillWidth: true
    spacing: 16

    property int videoCount: 0
    property string activeFolderName: ""
    property string viewMode: "grid"
    property bool importRunning: false

    signal backRequested()
    signal viewModeRequested(string mode)
    signal refreshRequested()
    signal importRequested()
    signal youtubeRequested()
    signal helpRequested()

    RowLayout {
        Layout.fillWidth: true
        spacing: 16

        ColumnLayout {
            spacing: 4
            RowLayout {
                spacing: 10
                Text { text: "🎬"; font.pixelSize: 28 }
                Text {
                    text: "Media Center & Vídeos"
                    color: "#fffffe"
                    font.pixelSize: 26
                    font.bold: true
                }
            }
            Text {
                text: "Decodificação acelerada por GPU (libmpv) • " + headerRoot.videoCount + " vídeo(s) catalogado(s)"
                color: "#a7a9be"
                font.pixelSize: 13
            }
        }

        Item { Layout.fillWidth: true }

        Button {
            Layout.preferredWidth: 38
            Layout.preferredHeight: 38
            Accessible.name: "Atalhos e controles"
            ToolTip.visible: hovered
            ToolTip.text: "Atalhos e controles"
            onClicked: headerRoot.helpRequested()
            background: Rectangle { color: parent.hovered ? "#252432" : "#1a1924"; radius: 9; border.color: "#18ffffff" }
            contentItem: Text { text: "?"; color: "#c4b5fd"; font.pixelSize: 18; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
        }

        Rectangle {
            height: 34
            width: 111
            radius: 8
            color: "#1a1924"
            border.color: "#0fffffff"
            RowLayout {
                anchors.fill: parent
                anchors.margins: 2
                spacing: 1
                Repeater {
                    model: [
                        { mode: "grid", glyph: "▦", label: "Visualização em grade" },
                        { mode: "list", glyph: "☰", label: "Visualização em lista" },
                        { mode: "compact", glyph: "≡", label: "Visualização compacta" }
                    ]
                    delegate: Button {
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        text: modelData.glyph
                        checkable: true
                        checked: headerRoot.viewMode === modelData.mode
                        Accessible.name: modelData.label
                        ToolTip.visible: hovered
                        ToolTip.text: modelData.label
                        onClicked: headerRoot.viewModeRequested(modelData.mode)
                        background: Rectangle {
                            color: parent.checked ? "#3e315e" : "transparent"
                            radius: 6
                        }
                        contentItem: Text {
                            text: parent.text
                            color: parent.checked ? "#ddd6fe" : "#a7a9be"
                            font.pixelSize: 15
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                    }
                }
            }
        }

        Rectangle {
            width: 150
            height: 38
            radius: 10
            color: headerRoot.importRunning ? "#343344" : "#272536"
            opacity: headerRoot.importRunning ? 0.65 : 1.0
            RowLayout {
                anchors.centerIn: parent
                spacing: 8
                Text { text: headerRoot.importRunning ? "◌" : "+"; color: "#ffffff"; font.pixelSize: 17; font.bold: true }
                Text {
                    text: headerRoot.importRunning ? "Importando…" : "Importar vídeo"
                    color: "#ffffff"
                    font.pixelSize: 13
                    font.bold: true
                }
            }
            MouseArea {
                anchors.fill: parent
                enabled: !headerRoot.importRunning
                cursorShape: enabled ? Qt.PointingHandCursor : Qt.ArrowCursor
                onClicked: headerRoot.importRequested()
            }
        }

        Rectangle {
            width: 130
            height: 38
            radius: 10
            color: "#272536"
            RowLayout {
                anchors.centerIn: parent
                spacing: 6
                Text { text: "▶"; color: "#ef4444"; font.pixelSize: 14 }
                Text { text: "YouTube"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
            }
            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: headerRoot.youtubeRequested()
            }
        }

        Rectangle {
            width: 140
            height: 38
            radius: 10
            color: "#6366f1"
            RowLayout {
                anchors.centerIn: parent
                spacing: 8
                Text { text: "↻"; color: "#ffffff"; font.pixelSize: 16; font.bold: true }
                Text { text: "Atualizar"; color: "#ffffff"; font.pixelSize: 13; font.bold: true }
            }
            MouseArea {
                anchors.fill: parent
                cursorShape: Qt.PointingHandCursor
                onClicked: headerRoot.refreshRequested()
            }
        }
    }

    RowLayout {
        Layout.fillWidth: true
        spacing: 8
        visible: headerRoot.activeFolderName.length > 0
        Button {
            text: "← Voltar"
            onClicked: headerRoot.backRequested()
            background: Rectangle { color: parent.hovered ? "#20ffffff" : "transparent"; radius: 6 }
            contentItem: Text { text: parent.text; color: "#a78bfa"; font.pixelSize: 13; font.bold: true; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
        }
        Text { text: "/"; color: "#ffffff"; opacity: 0.3; font.pixelSize: 13 }
        Text {
            Layout.fillWidth: true
            Layout.minimumWidth: 0
            text: headerRoot.activeFolderName
            color: "#fffffe"
            font.pixelSize: 13
            elide: Text.ElideRight
        }
    }
}
