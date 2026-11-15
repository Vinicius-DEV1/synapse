import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: root
    width: 320
    implicitHeight: contentCol.implicitHeight + 32
    radius: 14
    color: "#181724"
    border.color: "#25ffffff"
    border.width: 1
    visible: false
    z: 150

    property int fontSize: 19
    property string fontFamily: "Georgia"
    property string readingTheme: "dark"

    signal typographyChanged(int size, string family, string theme)
    signal closeRequested()

    readonly property var themes: [
        { id: "dark", label: "Escuro", bg: "#0f0e17", text: "#e8e8ee" },
        { id: "midnight", label: "Midnight", bg: "#090d16", text: "#e2e8f0" },
        { id: "sepia", label: "Sépia", bg: "#f4ecd8", text: "#5b4636" },
        { id: "light", label: "Claro", bg: "#ffffff", text: "#18181b" }
    ]

    readonly property var fontFamilies: [
        { id: "Georgia", label: "Com Serifa (Georgia)" },
        { id: "Inter", label: "Sem Serifa (Inter)" },
        { id: "DejaVu Sans", label: "DejaVu Sans" },
        { id: "Monospace", label: "Monoespaçada" }
    ]

    function openAt(x, y) {
        root.x = Math.max(16, Math.min(parent.width - root.width - 16, x))
        root.y = Math.max(16, Math.min(parent.height - root.height - 16, y))
        root.visible = true
    }

    ColumnLayout {
        id: contentCol
        anchors.fill: parent
        anchors.margins: 16
        spacing: 14

        RowLayout {
            Layout.fillWidth: true
            Text {
                text: "Aa Tipografia & Tema"
                color: "#fffffe"
                font.pixelSize: 14
                font.bold: true
            }
            Item { Layout.fillWidth: true }
            Rectangle {
                width: 24; height: 24; radius: 4
                color: "#15ffffff"
                Text { anchors.centerIn: parent; text: "✕"; color: "#a7a9be"; font.pixelSize: 11 }
                MouseArea {
                    anchors.fill: parent
                    cursorShape: Qt.PointingHandCursor
                    onClicked: { root.visible = false; root.closeRequested() }
                }
            }
        }

        Rectangle { Layout.fillWidth: true; height: 1; color: "#10ffffff" }

        // Font Size Stepper
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 6
            Text { text: "TAMANHO DA FONTE"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true }

            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Button {
                    Layout.preferredWidth: 36
                    Layout.preferredHeight: 32
                    text: "A-"
                    onClicked: {
                        root.fontSize = Math.max(12, root.fontSize - 1)
                        root.typographyChanged(root.fontSize, root.fontFamily, root.readingTheme)
                    }
                    background: Rectangle { color: "#242332"; radius: 6 }
                    contentItem: Text { text: parent.text; color: "#fffffe"; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                }

                Rectangle {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 32
                    radius: 6
                    color: "#12111d"
                    Text {
                        anchors.centerIn: parent
                        text: root.fontSize + " px"
                        color: "#818cf8"
                        font.pixelSize: 13
                        font.bold: true
                    }
                }

                Button {
                    Layout.preferredWidth: 36
                    Layout.preferredHeight: 32
                    text: "A+"
                    onClicked: {
                        root.fontSize = Math.min(36, root.fontSize + 1)
                        root.typographyChanged(root.fontSize, root.fontFamily, root.readingTheme)
                    }
                    background: Rectangle { color: "#242332"; radius: 6 }
                    contentItem: Text { text: parent.text; color: "#fffffe"; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
                }
            }
        }

        // Font Family Selector
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 6
            Text { text: "FAMÍLIA DA FONTE"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true }

            Repeater {
                model: root.fontFamilies
                delegate: Rectangle {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 28
                    radius: 6
                    color: root.fontFamily === modelData.id ? "#342b58" : (famMouse.hovered ? "#222131" : "transparent")
                    border.color: root.fontFamily === modelData.id ? "#818cf8" : "transparent"

                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 8
                        anchors.rightMargin: 8
                        Text {
                            text: modelData.label
                            color: root.fontFamily === modelData.id ? "#ddd6fe" : "#c4c5d4"
                            font.pixelSize: 12
                            font.family: modelData.id
                        }
                    }

                    MouseArea {
                        id: famMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            root.fontFamily = modelData.id
                            root.typographyChanged(root.fontSize, root.fontFamily, root.readingTheme)
                        }
                    }
                }
            }
        }

        // Reading Theme Swatches
        ColumnLayout {
            Layout.fillWidth: true
            spacing: 6
            Text { text: "TEMA DE LEITURA"; color: "#a7a9be"; font.pixelSize: 10; font.bold: true }

            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Repeater {
                    model: root.themes
                    delegate: Rectangle {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 34
                        radius: 6
                        color: modelData.bg
                        border.color: root.readingTheme === modelData.id ? "#818cf8" : "#30ffffff"
                        border.width: root.readingTheme === modelData.id ? 2 : 1

                        Text {
                            anchors.centerIn: parent
                            text: modelData.label
                            color: modelData.text
                            font.pixelSize: 11
                            font.bold: root.readingTheme === modelData.id
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                root.readingTheme = modelData.id
                                root.typographyChanged(root.fontSize, root.fontFamily, root.readingTheme)
                            }
                        }
                    }
                }
            }
        }
    }
}
