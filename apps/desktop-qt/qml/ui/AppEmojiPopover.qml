import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Popup {
    id: emojiPopoverRoot
    width: 320
    height: 380
    padding: 12
    modal: false
    focus: true
    closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside

    property string activeCategory: "frequent"
    property string searchQuery: ""

    signal emojiSelected(string emoji)

    Theme { id: theme }

    background: Rectangle {
        color: theme.bgDarkCard
        border.color: theme.borderBrand
        border.width: 1
        radius: 14
    }

    readonly property var categoryData: ({
        "frequent": {
            name: qsTr("Frequentes"),
            emojis: ["📄", "💡", "🚀", "📚", "💻", "🎨", "⚡", "🎯", "🔒", "⭐", "🧠", "🔥", "📊", "💰", "🎵", "📝", "✅", "⚠️", "🚩", "📌", "🔍", "📈", "📉", "🏆"]
        },
        "smileys": {
            name: qsTr("Smileys"),
            emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😋", "😛", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "🤔", "🤫", "🤭", "😴"]
        },
        "objects": {
            name: qsTr("Objetos & Estudo"),
            emojis: ["📁", "📂", "💼", "📕", "📖", "📗", "📘", "📙", "📚", "📓", "📒", "📃", "📜", "📄", "📰", "🔖", "🏷️", "💰", "💳", "💎", "🔧", "🔨", "🛠️", "⚙️", "🔬", "🔭", "📡", "💡", "🔦", "🕯️", "🧮", "🗑️"]
        },
        "symbols": {
            name: qsTr("Símbolos & Lazer"),
            emojis: ["⚡", "✨", "🌟", "⭐", "🎯", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "🎪", "🎭", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁", "🎷", "🎺", "🎸", "🎲", "♟️", "🎳", "🎮", "🕹️", "⚽", "🏀", "🎾", "🥊"]
        }
    })

    readonly property var currentEmojis: {
        var baseList = []
        if (searchQuery.trim().length > 0) {
            // Flatten all categories for search
            baseList = categoryData["frequent"].emojis.concat(
                categoryData["smileys"].emojis,
                categoryData["objects"].emojis,
                categoryData["symbols"].emojis
            )
        } else {
            baseList = categoryData[activeCategory] ? categoryData[activeCategory].emojis : categoryData["frequent"].emojis
        }
        return baseList
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 10

        // Search Input
        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 34
            radius: 8
            color: theme.bgDarkSurface
            border.color: searchInput.activeFocus ? theme.brand500 : theme.borderSubtle

            RowLayout {
                anchors.fill: parent
                anchors.margins: 8
                spacing: 8

                AppIcon { width: 14; height: 14; name: "search"; color: theme.textSubtext }

                TextInput {
                    id: searchInput
                    Layout.fillWidth: true
                    color: theme.textDark
                    font.pixelSize: 12
                    selectByMouse: true
                    clip: true
                    onTextChanged: emojiPopoverRoot.searchQuery = text

                    Text {
                        anchors.fill: parent
                        text: qsTr("Buscar emojis...")
                        color: theme.textMuted
                        font.pixelSize: 12
                        visible: !searchInput.text && !searchInput.activeFocus
                        verticalAlignment: Text.AlignVCenter
                    }
                }
            }
        }

        // Category Pills Row
        RowLayout {
            Layout.fillWidth: true
            spacing: 4

            Repeater {
                model: [
                    { id: "frequent", label: "⭐" },
                    { id: "smileys", label: "😀" },
                    { id: "objects", label: "📚" },
                    { id: "symbols", label: "⚡" }
                ]

                delegate: Rectangle {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 28
                    radius: 6
                    color: emojiPopoverRoot.activeCategory === modelData.id ? theme.activePillBg : (catMouse.containsMouse ? theme.bgHover : "transparent")
                    border.color: emojiPopoverRoot.activeCategory === modelData.id ? theme.brand500 : "transparent"
                    border.width: 1

                    Text {
                        anchors.centerIn: parent
                        text: modelData.label
                        font.pixelSize: 14
                    }

                    MouseArea {
                        id: catMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: {
                            emojiPopoverRoot.activeCategory = modelData.id
                            emojiPopoverRoot.searchQuery = ""
                            searchInput.text = ""
                        }
                    }
                }
            }
        }

        Rectangle { Layout.fillWidth: true; height: 1; color: theme.borderSubtle }

        // Emoji Grid
        Flickable {
            Layout.fillWidth: true
            Layout.fillHeight: true
            contentHeight: emojiGrid.implicitHeight
            clip: true
            boundsBehavior: Flickable.StopAtBounds

            GridLayout {
                id: emojiGrid
                width: parent.width
                columns: 6
                rowSpacing: 4
                columnSpacing: 4

                Repeater {
                    model: emojiPopoverRoot.currentEmojis

                    delegate: Rectangle {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 42
                        radius: 8
                        color: itemMouse.containsMouse ? theme.bgHover : "transparent"

                        Text {
                            anchors.centerIn: parent
                            text: modelData
                            font.pixelSize: 22
                        }

                        MouseArea {
                            id: itemMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                emojiPopoverRoot.emojiSelected(modelData)
                                emojiPopoverRoot.close()
                            }
                        }
                    }
                }
            }
        }
    }
}
