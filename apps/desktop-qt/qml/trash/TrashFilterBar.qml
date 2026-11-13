import QtQuick 2.15
import QtQuick.Layouts 1.15

RowLayout {
    id: filterBarRoot
    Layout.fillWidth: true
    spacing: 12

    property string activeTypeFilter: "all"
    property string searchQuery: ""

    signal filterSelected(string key)
    signal searchChanged(string text)

    // Filter Tabs
    Rectangle {
        height: 38
        radius: 10
        color: "#15141b"
        border.color: "#12ffffff"
        border.width: 1

        RowLayout {
            anchors.fill: parent
            anchors.margins: 4
            spacing: 4

            Repeater {
                model: [
                    { key: "all", label: "Todos" },
                    { key: "page", label: "Notas" },
                    { key: "anki_deck", label: "Baralhos" },
                    { key: "book", label: "Livros" },
                    { key: "vault", label: "Cofre" },
                    { key: "finance", label: "Finanças" },
                    { key: "file", label: "Arquivos" },
                    { key: "habit", label: "Hábitos" },
                    { key: "culture", label: "Cultura" },
                    { key: "calendar", label: "Agenda" }
                ]
                Rectangle {
                    height: 30
                    radius: 6
                    color: filterBarRoot.activeTypeFilter === modelData.key ? "#262438" : "transparent"
                    Layout.preferredWidth: tabText.contentWidth + 16
                    Text {
                        id: tabText
                        anchors.centerIn: parent
                        text: modelData.label
                        color: filterBarRoot.activeTypeFilter === modelData.key ? "#fffffe" : "#a7a9be"
                        font.pixelSize: 12
                        font.bold: filterBarRoot.activeTypeFilter === modelData.key
                    }
                    MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: filterBarRoot.filterSelected(modelData.key)
                    }
                }
            }
        }
    }

    Item { Layout.fillWidth: true }

    // Search Bar
    Rectangle {
        width: 220
        height: 38
        radius: 10
        color: "#15141b"
        border.color: searchInput.activeFocus ? "#808b5cf6" : "#12ffffff"
        border.width: 1

        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: 10
            anchors.rightMargin: 10
            spacing: 8

            Text { text: "🔍"; font.pixelSize: 11; color: "#a7a9be" }

            TextInput {
                id: searchInput
                Layout.fillWidth: true
                color: "#ffffff"
                font.pixelSize: 12
                selectByMouse: true
                onTextChanged: filterBarRoot.searchChanged(text)
                Text {
                    text: "Buscar na lixeira..."
                    color: "#64748b"
                    font.pixelSize: 12
                    visible: !searchInput.text && !searchInput.activeFocus
                }
            }
        }
    }
}
