pragma ComponentBehavior: Bound
import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import ".."

Rectangle {
    id: fieldsRoot
    Layout.fillWidth: true
    Layout.preferredHeight: contentCol.implicitHeight + 32
    radius: 16
    color: "#16161e"
    border.color: "#2e2e38"
    border.width: 1

    property var customFields: []
    signal fieldsChanged(var updated)

    function addField() {
        var copy = customFields ? customFields.slice(0) : []
        copy.push({ "key": "", "value": "", "type": "text" })
        fieldsRoot.customFields = copy
        fieldsRoot.fieldsChanged(copy)
    }

    function updateField(idx, fieldKey, val) {
        var copy = customFields ? customFields.slice(0) : []
        if (idx >= 0 && idx < copy.length) {
            var item = Object.assign({}, copy[idx])
            item[fieldKey] = val
            copy[idx] = item
            fieldsRoot.customFields = copy
            fieldsRoot.fieldsChanged(copy)
        }
    }

    function removeField(idx) {
        var copy = customFields ? customFields.slice(0) : []
        if (idx >= 0 && idx < copy.length) {
            copy.splice(idx, 1)
            fieldsRoot.customFields = copy
            fieldsRoot.fieldsChanged(copy)
        }
    }

    ColumnLayout {
        id: contentCol
        anchors.fill: parent
        anchors.margins: 16
        spacing: 12

        // Header
        RowLayout {
            Layout.fillWidth: true

            Text {
                text: "Campos Adicionais"
                color: "#a7a9be"
                font.pixelSize: 12
                font.weight: Font.DemiBold
                font.capitalization: Font.AllUppercase
                Layout.fillWidth: true
            }

            Rectangle {
                Layout.preferredHeight: 28
                Layout.preferredWidth: 128
                radius: 6
                color: addMouse.containsMouse ? "#2e2e38" : "transparent"

                RowLayout {
                    anchors.centerIn: parent
                    spacing: 4

                    AppIcon {
                        name: "plus"
                        color: "#7c3aed"
                        Layout.preferredWidth: 14
                        Layout.preferredHeight: 14
                    }

                    Text {
                        text: "Adicionar Campo"
                        color: "#c4b5fd"
                        font.pixelSize: 11
                        font.weight: Font.Medium
                    }
                }

                MouseArea {
                    id: addMouse
                    anchors.fill: parent
                    hoverEnabled: true
                    cursorShape: Qt.PointingHandCursor
                    onClicked: fieldsRoot.addField()
                }
            }
        }

        // Empty state
        Rectangle {
            visible: !fieldsRoot.customFields || fieldsRoot.customFields.length === 0
            Layout.fillWidth: true
            Layout.preferredHeight: 60
            radius: 8
            color: "#0f0e17"
            border.color: "#22222d"
            border.width: 1

            Text {
                anchors.centerIn: parent
                width: parent.width - 24
                text: "Nenhum campo adicional configurado. Adicione chaves PIX, perguntas de segurança, etc."
                color: "#6b7280"
                font.pixelSize: 11
                horizontalAlignment: Text.AlignHCenter
                wrapMode: Text.WordWrap
            }
        }

        // Fields List
        Repeater {
            model: fieldsRoot.customFields

            delegate: Rectangle {
                id: itemDelegate
                required property var modelData
                required property int index

                Layout.fillWidth: true
                Layout.preferredHeight: 74
                radius: 10
                color: "#0f0e17"
                border.color: "#2a2a36"
                border.width: 1

                RowLayout {
                    anchors.fill: parent
                    anchors.margins: 8
                    spacing: 8

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 4

                        TextField {
                            Layout.fillWidth: true
                            Layout.preferredHeight: 26
                            text: itemDelegate.modelData.key || ""
                            placeholderText: "Nome do campo (ex: PIN, Chave PIX)"
                            color: "#fffffe"
                            placeholderTextColor: "#4b5563"
                            font.pixelSize: 12
                            background: Rectangle { color: "transparent"; border.width: 0 }
                            onEditingFinished: fieldsRoot.updateField(itemDelegate.index, "key", text)
                        }

                        Rectangle {
                            Layout.fillWidth: true
                            Layout.preferredHeight: 1
                            color: "#2a2a36"
                        }

                        TextField {
                            Layout.fillWidth: true
                            Layout.preferredHeight: 26
                            text: itemDelegate.modelData.value || ""
                            placeholderText: "Valor do campo"
                            color: "#fffffe"
                            placeholderTextColor: "#4b5563"
                            font.pixelSize: 12
                            echoMode: itemDelegate.modelData.type === "hidden" ? TextInput.Password : TextInput.Normal
                            background: Rectangle { color: "transparent"; border.width: 0 }
                            onEditingFinished: fieldsRoot.updateField(itemDelegate.index, "value", text)
                        }
                    }

                    // Type Selector Pill
                    Rectangle {
                        Layout.preferredWidth: 64
                        Layout.preferredHeight: 28
                        radius: 6
                        color: "#16161e"
                        border.color: "#2e2e38"
                        border.width: 1

                        Text {
                            anchors.centerIn: parent
                            text: itemDelegate.modelData.type === "hidden" ? "Oculto" : (itemDelegate.modelData.type === "url" ? "URL" : "Texto")
                            color: "#a7a9be"
                            font.pixelSize: 11
                        }

                        MouseArea {
                            anchors.fill: parent
                            cursorShape: Qt.PointingHandCursor
                            onClicked: {
                                var curr = itemDelegate.modelData.type || "text"
                                var next = curr === "text" ? "hidden" : (curr === "hidden" ? "url" : "text")
                                fieldsRoot.updateField(itemDelegate.index, "type", next)
                            }
                        }
                    }

                    // Remove Button
                    Rectangle {
                        Layout.preferredWidth: 28
                        Layout.preferredHeight: 28
                        radius: 6
                        color: delMouse.containsMouse ? "#3b1e28" : "#1a1a24"

                        AppIcon {
                            anchors.centerIn: parent
                            name: "trash"
                            color: delMouse.containsMouse ? "#ef4444" : "#9ca3af"
                            Layout.preferredWidth: 14
                            Layout.preferredHeight: 14
                        }

                        MouseArea {
                            id: delMouse
                            anchors.fill: parent
                            hoverEnabled: true
                            cursorShape: Qt.PointingHandCursor
                            onClicked: fieldsRoot.removeField(itemDelegate.index)
                        }
                    }
                }
            }
        }
    }
}
