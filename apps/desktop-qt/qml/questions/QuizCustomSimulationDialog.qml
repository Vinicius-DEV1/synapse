import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: builderRoot
    anchors.fill: parent
    color: "#cc0f0e17"
    visible: builderRoot.isOpen
    z: 140

    property bool isOpen: false
    property var availableTags: []
    property var selectedTags: []
    property int questionLimit: 10
    property string selectedStatus: "all"
    property bool shuffle: true

    signal closed()
    signal startRequested(var tags, string status, int limit, bool shuffle)

    onIsOpenChanged: {
        if (isOpen) {
            selectedTags = []
            questionLimit = 10
            selectedStatus = "all"
            shuffle = true
        }
    }

    function toggleTag(tag) {
        var next = selectedTags.slice()
        var index = next.indexOf(tag)
        if (index >= 0) next.splice(index, 1)
        else next.push(tag)
        selectedTags = next
    }

    MouseArea { anchors.fill: parent }

    Rectangle {
        anchors.centerIn: parent
        width: Math.min(parent.width - 32, 680)
        height: Math.min(parent.height - 32, 620)
        radius: 18
        color: "#161524"
        border.color: "#18ffffff"
        border.width: 1

        ColumnLayout {
            anchors.fill: parent
            anchors.margins: 24
            spacing: 16

            RowLayout {
                Layout.fillWidth: true

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4
                    Text {
                        text: "Configurar simulado"
                        color: "#fffffe"
                        font.pixelSize: 18
                        font.bold: true
                    }
                    Text {
                        text: "Escolha as questões com base nas tags e no seu progresso."
                        color: "#a7a9be"
                        font.pixelSize: 12
                    }
                }

                Button {
                    text: "Fechar"
                    onClicked: builderRoot.closed()
                }
            }

            Rectangle {
                Layout.fillWidth: true
                Layout.preferredHeight: 1
                color: "#0fffffff"
            }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 8

                Text {
                    text: "Filtrar por tags"
                    color: "#d4d4d8"
                    font.pixelSize: 12
                    font.bold: true
                }

                Text {
                    visible: builderRoot.availableTags.length === 0
                    text: "Nenhuma tag foi adicionada às questões ainda."
                    color: "#71717a"
                    font.pixelSize: 12
                }

                ScrollView {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 126
                    visible: builderRoot.availableTags.length > 0
                    clip: true
                    contentWidth: width

                    Flow {
                        width: parent.width
                        spacing: 8

                        Repeater {
                            model: builderRoot.availableTags

                            delegate: Rectangle {
                                id: tagChip
                                property string tagName: modelData
                                property bool isSelected: builderRoot.selectedTags.indexOf(tagName) >= 0
                                implicitWidth: tagText.implicitWidth + 22
                                implicitHeight: 32
                                radius: 9
                                color: isSelected ? "#33305a" : "#1c1b2e"
                                border.color: isSelected ? "#665dba" : "#12ffffff"

                                Text {
                                    id: tagText
                                    anchors.centerIn: parent
                                    text: "#" + tagChip.tagName
                                    color: tagChip.isSelected ? "#c7c3ff" : "#a7a9be"
                                    font.pixelSize: 11
                                }

                                MouseArea {
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    onClicked: builderRoot.toggleTag(tagChip.tagName)
                                }
                            }
                        }
                    }
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 24

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 8
                    Text { text: "Quantidade"; color: "#d4d4d8"; font.pixelSize: 12; font.bold: true }
                    RowLayout {
                        spacing: 6
                        Repeater {
                            model: [5, 10, 20, 30, 50]
                            delegate: Button {
                                text: String(modelData)
                                highlighted: builderRoot.questionLimit === modelData
                                onClicked: builderRoot.questionLimit = modelData
                            }
                        }
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 8
                    Text { text: "Estado"; color: "#d4d4d8"; font.pixelSize: 12; font.bold: true }
                    RowLayout {
                        spacing: 6
                        Button {
                            text: "Todas"
                            highlighted: builderRoot.selectedStatus === "all"
                            onClicked: builderRoot.selectedStatus = "all"
                        }
                        Button {
                            text: "Sem resposta"
                            highlighted: builderRoot.selectedStatus === "unanswered"
                            onClicked: builderRoot.selectedStatus = "unanswered"
                        }
                        Button {
                            text: "Erros"
                            highlighted: builderRoot.selectedStatus === "incorrect"
                            onClicked: builderRoot.selectedStatus = "incorrect"
                        }
                    }
                }
            }

            CheckBox {
                text: "Embaralhar questões"
                checked: builderRoot.shuffle
                onToggled: builderRoot.shuffle = checked
            }

            Item { Layout.fillHeight: true }

            RowLayout {
                Layout.fillWidth: true
                spacing: 12

                Button {
                    Layout.fillWidth: true
                    text: "Cancelar"
                    onClicked: builderRoot.closed()
                }
                Button {
                    Layout.fillWidth: true
                    text: "Iniciar simulado"
                    highlighted: true
                    onClicked: builderRoot.startRequested(
                        builderRoot.selectedTags,
                        builderRoot.selectedStatus,
                        builderRoot.questionLimit,
                        builderRoot.shuffle
                    )
                }
            }
        }
    }
}
