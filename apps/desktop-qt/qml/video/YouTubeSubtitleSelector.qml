import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

ColumnLayout {
    id: root
    spacing: 8
    Layout.fillWidth: true

    property var availableSubs: []
    property var selectedSubs: []
    property string searchText: ""

    signal subToggled(string lang)

    function isSelected(lang) {
        if (!selectedSubs) return false
        for (var i = 0; i < selectedSubs.length; ++i) {
            if (selectedSubs[i] === lang) return true
        }
        return false
    }

    RowLayout {
        Layout.fillWidth: true
        spacing: 8

        Text {
            text: "💬 Legendas Disponíveis (" + root.availableSubs.length + ")"
            color: "#d4d4dc"
            font.pixelSize: 13
            font.bold: true
        }

        Item { Layout.fillWidth: true }

        TextField {
            id: searchInput
            Layout.preferredWidth: 140
            Layout.preferredHeight: 28
            placeholderText: "Filtrar idioma…"
            color: "#fffffe"
            font.pixelSize: 11
            placeholderTextColor: "#64748b"
            text: root.searchText
            onTextChanged: root.searchText = text

            background: Rectangle {
                color: "#141320"
                radius: 6
                border.color: searchInput.activeFocus ? "#818cf8" : "#20ffffff"
            }
        }
    }

    Rectangle {
        Layout.fillWidth: true
        Layout.preferredHeight: 130
        radius: 8
        color: "#141320"
        border.color: "#15ffffff"
        border.width: 1
        clip: true

        ListView {
            id: subsList
            anchors.fill: parent
            anchors.margins: 4
            spacing: 2
            clip: true

            model: {
                var list = []
                var q = root.searchText.toLowerCase().trim()
                for (var i = 0; i < root.availableSubs.length; ++i) {
                    var s = root.availableSubs[i]
                    var name = (s.name || s.lang || "").toLowerCase()
                    var code = (s.lang || "").toLowerCase()
                    if (q.length === 0 || name.indexOf(q) !== -1 || code.indexOf(q) !== -1) {
                        list.push(s)
                    }
                }
                return list
            }

            delegate: Rectangle {
                width: subsList.width
                height: 32
                radius: 6
                color: itemMouse.hovered ? "#201f30" : "transparent"

                RowLayout {
                    anchors.fill: parent
                    anchors.leftMargin: 8
                    anchors.rightMargin: 8
                    spacing: 8

                    CheckBox {
                        id: cb
                        checked: root.isSelected(modelData.lang)
                        onToggled: root.subToggled(modelData.lang)

                        indicator: Rectangle {
                            implicitWidth: 16
                            implicitHeight: 16
                            x: cb.leftPadding
                            y: parent.height / 2 - height / 2
                            radius: 4
                            color: cb.checked ? "#6366f1" : "transparent"
                            border.color: cb.checked ? "#6366f1" : "#55ffffff"

                            Text {
                                anchors.centerIn: parent
                                text: "✓"
                                color: "#ffffff"
                                font.pixelSize: 11
                                font.bold: true
                                visible: cb.checked
                            }
                        }
                    }

                    Text {
                        Layout.fillWidth: true
                        text: (modelData.name || modelData.lang).toUpperCase() + " (" + modelData.lang + ")"
                        color: "#fffffe"
                        font.pixelSize: 12
                        elide: Text.ElideRight
                    }

                    Rectangle {
                        visible: modelData.isAuto === true
                        height: 18
                        width: 44
                        radius: 4
                        color: "#20ffffff"

                        Text {
                            anchors.centerIn: parent
                            text: "AUTO"
                            color: "#94a3b8"
                            font.pixelSize: 9
                            font.bold: true
                        }
                    }
                }

                MouseArea {
                    id: itemMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: root.subToggled(modelData.lang)
                }
            }

            Text {
                anchors.centerIn: parent
                visible: subsList.count === 0
                text: root.availableSubs.length === 0
                      ? "Nenhuma legenda detectada"
                      : "Nenhuma legenda correspondente"
                color: "#64748b"
                font.pixelSize: 12
            }
        }
    }
}
