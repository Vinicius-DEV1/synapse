import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Item {
    id: handleRoot
    width: 24
    height: 24

    property bool activeVisible: false
    property bool canMoveUp: true
    property bool canMoveDown: true
    property bool showColorSubmenu: false
    property bool isDragging: false
    readonly property bool handleHovered: handleBtn.hovered || bridgeHover.hovered || blockMenu.visible

    readonly property var textColors: [
        { name: qsTr("Padrão"), value: "inherit", hex: "#262533" },
        { name: qsTr("Cinza"), value: "#9ca3af", hex: "#9ca3af" },
        { name: qsTr("Marrom"), value: "#b45309", hex: "#b45309" },
        { name: qsTr("Laranja"), value: "#f97316", hex: "#f97316" },
        { name: qsTr("Amarelo"), value: "#eab308", hex: "#eab308" },
        { name: qsTr("Verde"), value: "#10b981", hex: "#10b981" },
        { name: qsTr("Azul"), value: "#3b82f6", hex: "#3b82f6" },
        { name: qsTr("Roxo"), value: "#8b5cf6", hex: "#8b5cf6" },
        { name: qsTr("Rosa"), value: "#ec4899", hex: "#ec4899" },
        { name: qsTr("Vermelho"), value: "#ef4444", hex: "#ef4444" }
    ]

    readonly property var bgColors: [
        { name: qsTr("Padrão"), value: "transparent", hex: "#262533" },
        { name: qsTr("Cinza"), value: "rgba(156,163,175,0.16)", hex: "#9ca3af" },
        { name: qsTr("Marrom"), value: "rgba(180,83,9,0.18)", hex: "#b45309" },
        { name: qsTr("Laranja"), value: "rgba(249,115,22,0.18)", hex: "#f97316" },
        { name: qsTr("Amarelo"), value: "rgba(234,179,8,0.18)", hex: "#eab308" },
        { name: qsTr("Verde"), value: "rgba(16,185,129,0.18)", hex: "#10b981" },
        { name: qsTr("Azul"), value: "rgba(59,130,246,0.18)", hex: "#3b82f6" },
        { name: qsTr("Roxo"), value: "rgba(139,92,246,0.20)", hex: "#8b5cf6" },
        { name: qsTr("Rosa"), value: "rgba(236,72,153,0.18)", hex: "#ec4899" },
        { name: qsTr("Vermelho"), value: "rgba(239,68,68,0.18)", hex: "#ef4444" }
    ]

    signal moveUpRequested()
    signal moveDownRequested()
    signal duplicateRequested()
    signal insertBelowRequested()
    signal colorChangeRequested(string color, bool isBackground)
    signal deleteRequested()
    signal dragStarted()
    signal dragMoved(real globalX, real globalY)
    signal dragEnded()

    // Invisible hover bridge connecting handle to block content without flicker
    Item {
        anchors.left: parent.right
        anchors.top: parent.top
        width: 16
        height: parent.height
        HoverHandler { id: bridgeHover }
    }

    ToolButton {
        id: handleBtn
        anchors.fill: parent
        opacity: handleRoot.activeVisible || hovered || blockMenu.visible || handleRoot.isDragging ? 1 : 0
        Behavior on opacity { NumberAnimation { duration: 120 } }
        focusPolicy: Qt.NoFocus
        hoverEnabled: true
        ToolTip.visible: hovered && !handleRoot.isDragging
        ToolTip.text: qsTr("Opções do bloco (Clique para abrir ou arraste para mover)")
        background: Rectangle {
            radius: 6
            color: blockMenu.visible || handleRoot.isDragging ? "#338b5cf6" : (parent.hovered ? "#1affffff" : "transparent")
            border.color: blockMenu.visible || handleRoot.isDragging ? "#4d8b5cf6" : "transparent"
        }
        contentItem: Column {
            anchors.centerIn: parent
            spacing: 2
            Repeater {
                model: 3
                delegate: Row {
                    spacing: 2
                    Rectangle { width: 2.5; height: 2.5; radius: 1.25; color: handleBtn.hovered || blockMenu.visible ? "#fffffe" : "#71717a" }
                    Rectangle { width: 2.5; height: 2.5; radius: 1.25; color: handleBtn.hovered || blockMenu.visible ? "#fffffe" : "#71717a" }
                }
            }
        }
        MouseArea {
            anchors.fill: parent
            cursorShape: handleRoot.isDragging ? Qt.ClosedHandCursor : Qt.OpenHandCursor
            property real pressX: 0
            property real pressY: 0
            property bool movedEnough: false
            onPressed: function(mouse) {
                pressX = mouse.x
                pressY = mouse.y
                movedEnough = false
            }
            onPositionChanged: function(mouse) {
                if (!pressed) return
                if (!movedEnough && (Math.abs(mouse.x - pressX) > 6 || Math.abs(mouse.y - pressY) > 6)) {
                    movedEnough = true
                    handleRoot.isDragging = true
                    handleRoot.dragStarted()
                }
                if (movedEnough) {
                    var g = mapToGlobal(mouse.x, mouse.y)
                    handleRoot.dragMoved(g.x, g.y)
                }
            }
            onReleased: {
                if (movedEnough) {
                    handleRoot.isDragging = false
                    handleRoot.dragEnded()
                } else {
                    handleRoot.showColorSubmenu = false
                    blockMenu.open()
                }
            }
        }
    }

    Popup {
        id: blockMenu
        x: handleRoot.width + 4
        y: 0
        width: 214
        padding: 6
        closePolicy: Popup.CloseOnEscape | Popup.CloseOnPressOutside
        background: Rectangle {
            color: "#f20f0e17"
            radius: 12
            border.color: "#14ffffff"
            border.width: 1
        }
        contentItem: ColumnLayout {
            spacing: 2

            ColumnLayout {
                visible: !handleRoot.showColorSubmenu
                Layout.fillWidth: true
                spacing: 2

                Repeater {
                    model: [
                        { id: "up", label: qsTr("Subir bloco"), icon: "arrow-up", enabled: handleRoot.canMoveUp },
                        { id: "down", label: qsTr("Descer bloco"), icon: "arrow-down", enabled: handleRoot.canMoveDown },
                        { id: "add", label: qsTr("Adicionar linha abaixo"), icon: "plus", enabled: true },
                        { id: "dup", label: qsTr("Duplicar bloco"), icon: "copy", enabled: true }
                    ]
                    delegate: Button {
                        required property var modelData
                        Layout.fillWidth: true
                        Layout.preferredHeight: 28
                        enabled: modelData.enabled
                        opacity: enabled ? 1 : 0.4
                        focusPolicy: Qt.NoFocus
                        onClicked: {
                            blockMenu.close()
                            if (modelData.id === "up") handleRoot.moveUpRequested()
                            else if (modelData.id === "down") handleRoot.moveDownRequested()
                            else if (modelData.id === "add") handleRoot.insertBelowRequested()
                            else if (modelData.id === "dup") handleRoot.duplicateRequested()
                        }
                        background: Rectangle { radius: 6; color: parent.hovered ? "#1affffff" : "transparent" }
                        contentItem: RowLayout {
                            spacing: 8
                            AppIcon { name: modelData.icon; color: "#a7a9be"; width: 13; height: 13 }
                            Text { text: modelData.label; color: "#fffffe"; font.pixelSize: 12; Layout.fillWidth: true }
                        }
                    }
                }

                Rectangle { Layout.fillWidth: true; Layout.preferredHeight: 1; Layout.margins: 4; color: "#1affffff" }

                Button {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 28
                    focusPolicy: Qt.NoFocus
                    onClicked: handleRoot.showColorSubmenu = true
                    background: Rectangle { radius: 6; color: parent.hovered ? "#1affffff" : "transparent" }
                    contentItem: RowLayout {
                        spacing: 8
                        AppIcon { name: "palette"; color: "#a7a9be"; width: 13; height: 13 }
                        Text { text: qsTr("Cor e Realce"); color: "#fffffe"; font.pixelSize: 12; Layout.fillWidth: true }
                        AppIcon { name: "chevron-right"; color: "#71717a"; width: 12; height: 12 }
                    }
                }

                Rectangle { Layout.fillWidth: true; Layout.preferredHeight: 1; Layout.margins: 4; color: "#1affffff" }

                Button {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 28
                    focusPolicy: Qt.NoFocus
                    onClicked: {
                        blockMenu.close()
                        handleRoot.deleteRequested()
                    }
                    background: Rectangle { radius: 6; color: parent.hovered ? "#1aef4444" : "transparent" }
                    contentItem: RowLayout {
                        spacing: 8
                        AppIcon { name: "trash"; color: "#f87171"; width: 13; height: 13 }
                        Text { text: qsTr("Excluir bloco"); color: "#f87171"; font.pixelSize: 12; Layout.fillWidth: true }
                    }
                }
            }

            ColumnLayout {
                visible: handleRoot.showColorSubmenu
                Layout.fillWidth: true
                spacing: 6

                Button {
                    Layout.preferredHeight: 24
                    focusPolicy: Qt.NoFocus
                    onClicked: handleRoot.showColorSubmenu = false
                    background: Rectangle { radius: 5; color: parent.hovered ? "#1affffff" : "transparent" }
                    contentItem: Text { text: "← " + qsTr("Voltar"); color: "#a78bfa"; font.pixelSize: 11; font.weight: Font.Medium }
                }

                Text { text: qsTr("COR DO TEXTO"); color: "#a7a9be"; font.pixelSize: 9; font.bold: true; Layout.leftMargin: 4 }
                GridLayout {
                    columns: 5
                    columnSpacing: 6
                    rowSpacing: 6
                    Layout.leftMargin: 4
                    Repeater {
                        model: handleRoot.textColors
                        delegate: Rectangle {
                            required property var modelData
                            width: 24; height: 24; radius: 12
                            color: modelData.hex
                            border.color: "#22ffffff"
                            Text { anchors.centerIn: parent; visible: modelData.value === "inherit"; text: "A"; color: "#fff"; font.pixelSize: 11; font.bold: true }
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    handleRoot.colorChangeRequested(modelData.value, false)
                                    blockMenu.close()
                                }
                            }
                        }
                    }
                }

                Text { text: qsTr("COR DE FUNDO"); color: "#a7a9be"; font.pixelSize: 9; font.bold: true; Layout.leftMargin: 4; Layout.topMargin: 4 }
                GridLayout {
                    columns: 5
                    columnSpacing: 6
                    rowSpacing: 6
                    Layout.leftMargin: 4
                    Repeater {
                        model: handleRoot.bgColors
                        delegate: Rectangle {
                            required property var modelData
                            width: 24; height: 24; radius: 6
                            color: modelData.value === "transparent" ? "#262533" : modelData.value
                            border.color: "#22ffffff"
                            Text { anchors.centerIn: parent; text: "A"; color: modelData.value === "transparent" ? "#fff" : modelData.hex; font.pixelSize: 11; font.bold: true }
                            MouseArea {
                                anchors.fill: parent
                                cursorShape: Qt.PointingHandCursor
                                onClicked: {
                                    handleRoot.colorChangeRequested(modelData.value, true)
                                    blockMenu.close()
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
