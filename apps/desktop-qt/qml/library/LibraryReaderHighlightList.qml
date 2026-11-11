import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: highlightList
    spacing: 7

    property var highlights: []
    property bool hasLibraryHighlights: false
    property bool busy: false
    property string editingId: ""
    property string editingNote: ""
    property string editingColor: "yellow"
    readonly property var colors: [
        { value: "yellow", name: "Amarelo" },
        { value: "green", name: "Verde" },
        { value: "blue", name: "Azul" },
        { value: "pink", name: "Rosa" },
        { value: "orange", name: "Laranja" }
    ]

    signal jumpRequested(int pageNumber)
    signal editRequested(var highlight)
    signal noteChanged(string note)
    signal colorChanged(string color)
    signal saveRequested(string id, string note, string color)
    signal cancelRequested()
    signal deleteRequested(string id)

    function colorValue(name) {
        var palette = { yellow: "#fbbf24", green: "#34d399", blue: "#60a5fa", pink: "#f472b6", orange: "#fb923c" }
        return palette[name] || palette.yellow
    }

    Repeater {
        model: highlightList.highlights
        delegate: Rectangle {
            id: highlightCard
            property var highlightData: modelData
            property bool isEditing: highlightList.editingId === highlightData.id
            Layout.fillWidth: true
            implicitHeight: highlightContent.implicitHeight + 16
            radius: 7
            color: "#242331"
            border.color: "#16ffffff"

            ColumnLayout {
                id: highlightContent
                anchors.fill: parent
                anchors.margins: 8
                spacing: 6

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 7
                    Rectangle {
                        width: 7
                        height: 7
                        radius: 4
                        color: highlightList.colorValue(highlightCard.highlightData.color)
                    }
                    Text {
                        Layout.fillWidth: true
                        text: "Pág. " + highlightCard.highlightData.page_number
                        color: "#a7a9be"
                        font.pixelSize: 9
                    }
                }

                Text {
                    Layout.fillWidth: true
                    text: "“" + highlightCard.highlightData.text_content + "”"
                    color: "#e9d5a4"
                    font.pixelSize: 11
                    wrapMode: Text.Wrap
                }

                Text {
                    Layout.fillWidth: true
                    visible: !highlightCard.isEditing && !!highlightCard.highlightData.note
                    text: highlightCard.highlightData.note || ""
                    color: "#c4b5fd"
                    font.pixelSize: 10
                    wrapMode: Text.Wrap
                }

                RowLayout {
                    Layout.fillWidth: true
                    visible: !highlightCard.isEditing
                    Button {
                        text: "Editar nota"
                        enabled: !highlightList.busy
                        onClicked: highlightList.editRequested(highlightCard.highlightData)
                        background: Rectangle { color: "#302a43"; radius: 6 }
                        contentItem: Text {
                            text: parent.text
                            color: "#c4b5fd"
                            font.pixelSize: 9
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                    }
                    Button {
                        text: "Ir à página"
                        onClicked: highlightList.jumpRequested(Number(highlightCard.highlightData.page_number))
                        background: Rectangle { color: "transparent" }
                        contentItem: Text {
                            text: parent.text
                            color: "#a7a9be"
                            font.pixelSize: 9
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                    }
                    Item { Layout.fillWidth: true }
                    Button {
                        text: "Excluir"
                        enabled: !highlightList.busy
                        Accessible.name: "Excluir destaque da página " + highlightCard.highlightData.page_number
                        onClicked: highlightList.deleteRequested(highlightCard.highlightData.id)
                        background: Rectangle { color: "transparent" }
                        contentItem: Text {
                            text: parent.text
                            color: "#fb7185"
                            font.pixelSize: 9
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                        }
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    visible: highlightCard.isEditing
                    spacing: 5
                    TextField {
                        Layout.fillWidth: true
                        text: highlightCard.isEditing ? highlightList.editingNote : ""
                        placeholderText: "Adicionar nota…"
                        selectByMouse: true
                        color: "#eeeeF4"
                        font.pixelSize: 10
                        background: Rectangle { color: "#111019"; border.color: "#20ffffff"; radius: 7 }
                        onTextChanged: if (highlightCard.isEditing) highlightList.noteChanged(text)
                        Keys.onReturnPressed: highlightList.saveRequested(highlightCard.highlightData.id,
                                                                            highlightList.editingNote,
                                                                            highlightList.editingColor)
                        Keys.onEscapePressed: highlightList.cancelRequested()
                    }
                    RowLayout {
                        Layout.fillWidth: true
                        Text { text: "Cor"; color: "#a7a9be"; font.pixelSize: 9 }
                        Repeater {
                            model: highlightList.colors
                            delegate: Button {
                                implicitWidth: 18
                                implicitHeight: 18
                                padding: 0
                                Accessible.name: "Usar cor " + modelData.name
                                onClicked: highlightList.colorChanged(modelData.value)
                                ToolTip.visible: hovered
                                ToolTip.text: modelData.name
                                background: Rectangle {
                                    radius: 9
                                    color: highlightList.colorValue(modelData.value)
                                    border.width: highlightList.editingColor === modelData.value ? 2 : 1
                                    border.color: highlightList.editingColor === modelData.value ? "white" : "#40ffffff"
                                }
                            }
                        }
                        Item { Layout.fillWidth: true }
                    }
                    RowLayout {
                        Layout.fillWidth: true
                        Item { Layout.fillWidth: true }
                        Button {
                            text: "Cancelar"
                            onClicked: highlightList.cancelRequested()
                            background: Rectangle { color: "transparent" }
                            contentItem: Text {
                                text: parent.text
                                color: "#a7a9be"
                                font.pixelSize: 9
                                horizontalAlignment: Text.AlignHCenter
                                verticalAlignment: Text.AlignVCenter
                            }
                        }
                        Button {
                            text: "Salvar"
                            enabled: !highlightList.busy
                            onClicked: highlightList.saveRequested(highlightCard.highlightData.id,
                                                                   highlightList.editingNote,
                                                                   highlightList.editingColor)
                            background: Rectangle { color: "#3e315e"; radius: 6 }
                            contentItem: Text {
                                text: parent.text
                                color: "#ddd6fe"
                                font.pixelSize: 9
                                horizontalAlignment: Text.AlignHCenter
                                verticalAlignment: Text.AlignVCenter
                            }
                        }
                    }
                }
            }
        }
    }

    Text {
        visible: highlightList.highlights.length === 0
        text: highlightList.hasLibraryHighlights ? "Nenhuma anotação encontrada." : "Sem destaques."
        color: "#767789"
        font.pixelSize: 11
    }
}
