import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: deckListRoot
    spacing: 12

    property var hierarchicalDecks: []
    property var collapsedDeckMap: ({})
    property var isDeckVisibleFn: null

    signal requestToggleCollapse(string deckId)
    signal requestCreateSubDeck(var parentDeck)
    signal requestOpenBrowser(var deck)
    signal requestStartStudy(var deck)

    function isDeckVisible(deck) {
        if (!deck) return false;
        if (deck.parent_id && collapsedDeckMap[deck.parent_id] === true) return false;
        return true;
    }

    // Table Header (BARALHO | ESTATÍSTICAS | AÇÕES)
    Rectangle {
        Layout.fillWidth: true
        height: 36
        radius: 8
        color: "#15141b"
        border.color: "#0affffff"
        border.width: 1

        RowLayout {
            anchors.fill: parent; anchors.leftMargin: 16; anchors.rightMargin: 16; spacing: 16

            Text {
                Layout.fillWidth: true
                text: "BARALHO"
                color: "#64748b"
                font.pixelSize: 11; font.bold: true; font.letterSpacing: 1.2
            }

            Text {
                Layout.preferredWidth: 200
                text: "ESTATÍSTICAS"
                color: "#64748b"
                font.pixelSize: 11
                font.bold: true
                font.letterSpacing: 1.2
                horizontalAlignment: Text.AlignHCenter
            }

            Text {
                Layout.preferredWidth: 220
                text: "AÇÕES"
                color: "#64748b"
                font.pixelSize: 11
                font.bold: true
                font.letterSpacing: 1.2
                horizontalAlignment: Text.AlignRight
            }
        }
    }

    // Decks Repeater (Hierarchical Rows)
    ColumnLayout {
        Layout.fillWidth: true
        spacing: 8

        Repeater {
            model: deckListRoot.hierarchicalDecks

            delegate: Item {
                id: deckDelegate
                property bool isVisibleInTree: deckListRoot.isDeckVisible(modelData)
                property bool isCollapsed: deckListRoot.collapsedDeckMap[modelData.id] === true
                property int depth: modelData.depth || 0

                visible: isVisibleInTree
                Layout.fillWidth: true
                Layout.preferredHeight: isVisibleInTree ? 64 : 0

                Rectangle {
                    anchors.left: parent.left
                    anchors.right: parent.right
                    anchors.top: parent.top
                    anchors.bottom: parent.bottom
                    anchors.leftMargin: deckDelegate.depth * 24
                    radius: 12
                    color: rowMouse.containsMouse ? "#211f30" : "#1a1924"
                    border.color: rowMouse.containsMouse ? "#666366f1" : "#0dffffff"
                    border.width: 1

                    Behavior on color { ColorAnimation { duration: 150 } }
                    Behavior on border.color { ColorAnimation { duration: 150 } }

                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 12
                        anchors.rightMargin: 14
                        spacing: 12

                        // Chevron expand/collapse button
                        Item {
                            width: 24
                            height: 24

                            Text {
                                anchors.centerIn: parent
                                text: deckDelegate.isCollapsed ? "▶" : "▼"
                                font.pixelSize: 11
                                color: "#a7a9be"
                                visible: modelData.has_children === true
                            }

                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                enabled: modelData.has_children === true
                                onClicked: deckListRoot.requestToggleCollapse(modelData.id)
                            }
                        }

                        // Layers Icon
                        Text {
                            text: "🗂️"
                            font.pixelSize: 16
                        }

                        // Title & Description
                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 2

                            Text {
                                Layout.fillWidth: true
                                text: modelData.name || "Sem título"
                                color: rowMouse.containsMouse ? "#ffffff" : "#eefffffe"
                                font.pixelSize: 15
                                font.bold: true
                                elide: Text.ElideRight
                            }

                            Text {
                                Layout.fillWidth: true
                                text: modelData.description || (modelData.card_count ? modelData.card_count + " cartões no total" : "Sem descrição")
                                color: "#a7a9be"
                                font.pixelSize: 12
                                elide: Text.ElideRight
                            }
                        }

                        // Stats Pill (Novos / Aprendendo / A Revisar)
                        Rectangle {
                            Layout.preferredWidth: 200
                            height: 32
                            radius: 8
                            color: "#0f0e17"
                            border.color: "#0fffffff"
                            border.width: 1

                            RowLayout {
                                anchors.centerIn: parent
                                spacing: 16

                                // Novos (Blue)
                                RowLayout {
                                    spacing: 5
                                    Rectangle { width: 7; height: 7; radius: 3.5; color: "#38bdf8" }
                                    Text { text: "" + (modelData.novos || 0); color: "#38bdf8"; font.pixelSize: 12; font.bold: true }
                                }

                                // Aprendendo (Orange)
                                RowLayout {
                                    spacing: 5
                                    Rectangle { width: 7; height: 7; radius: 3.5; color: "#f59e0b" }
                                    Text { text: "" + (modelData.aprender || 0); color: "#f59e0b"; font.pixelSize: 12; font.bold: true }
                                }

                                // A Revisar (Green)
                                RowLayout {
                                    spacing: 5
                                    Rectangle { width: 7; height: 7; radius: 3.5; color: "#10b981" }
                                    Text { text: "" + (modelData.revisar || 0); color: "#10b981"; font.pixelSize: 12; font.bold: true }
                                }
                            }
                        }

                        // Action Buttons: [+] Criar Subbaralho | [⚙] Gerenciar | [Estudar ▶]
                        RowLayout {
                            Layout.preferredWidth: 220
                            spacing: 8
                            Layout.alignment: Qt.AlignRight

                            // [+] Add Sub-deck button
                            Rectangle {
                                width: 32
                                height: 32
                                radius: 8
                                color: subMouse.containsMouse ? "#18ffffff" : "#0affffff"

                                Text {
                                    anchors.centerIn: parent
                                    text: "+"
                                    color: "#a7a9be"
                                    font.pixelSize: 16
                                    font.bold: true
                                }

                                MouseArea {
                                    id: subMouse
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    hoverEnabled: true
                                    onClicked: deckListRoot.requestCreateSubDeck(modelData)
                                }
                            }

                            // [⚙] Manage Deck / DeckBrowser button
                            Rectangle {
                                width: 32
                                height: 32
                                radius: 8
                                color: gearMouse.containsMouse ? "#18ffffff" : "#0affffff"

                                Text {
                                    anchors.centerIn: parent
                                    text: "⚙"
                                    color: "#a7a9be"
                                    font.pixelSize: 14
                                }

                                MouseArea {
                                    id: gearMouse
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    hoverEnabled: true
                                    onClicked: deckListRoot.requestOpenBrowser(modelData)
                                }
                            }

                            // [Estudar ▶] Button
                            Rectangle {
                                width: 104
                                height: 34
                                radius: 8
                                color: studyBtnMouse.containsMouse ? "#4338ca" : "#4f46e5"

                                RowLayout {
                                    anchors.centerIn: parent
                                    spacing: 6
                                    Text { text: "▶"; color: "#ffffff"; font.pixelSize: 10 }
                                    Text { text: "Estudar"; color: "#ffffff"; font.pixelSize: 12; font.bold: true }
                                }

                                MouseArea {
                                    id: studyBtnMouse
                                    anchors.fill: parent
                                    cursorShape: Qt.PointingHandCursor
                                    hoverEnabled: true
                                    onClicked: deckListRoot.requestStartStudy(modelData)
                                }
                            }
                        }
                    }

                    MouseArea {
                        id: rowMouse
                        anchors.fill: parent
                        z: -1
                        hoverEnabled: true
                    }
                }
            }
        }
    }

    // Empty state when no decks exist
    Rectangle {
        visible: deckListRoot.hierarchicalDecks.length === 0
        Layout.fillWidth: true
        height: 240
        radius: 16
        color: "#161524"
        border.color: "#0affffff"

        ColumnLayout {
            anchors.centerIn: parent
            spacing: 12
            Text { Layout.alignment: Qt.AlignHCenter; text: "🎴"; font.pixelSize: 40; opacity: 0.5 }
            Text { Layout.alignment: Qt.AlignHCenter; text: "Nenhum baralho encontrado"; color: "#fffffe"; font.pixelSize: 16; font.bold: true }
            Text { Layout.alignment: Qt.AlignHCenter; text: "Crie um baralho para começar a estudar."; color: "#a7a9be"; font.pixelSize: 13 }
        }
    }
}
