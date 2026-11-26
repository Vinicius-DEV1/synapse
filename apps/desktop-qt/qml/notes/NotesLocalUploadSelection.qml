pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import QtQuick.Dialogs
import "NotesMediaWidgetPickerOperations.js" as PickerOperations
import "../ui"

ColumnLayout {
    id: selectionRoot
    Layout.fillWidth: true
    spacing: 8

    property var localFiles: []
    property bool waiting: false
    property bool canRemove: true
    property bool groupAsBundle: true
    property bool isDraggingOver: false
    readonly property bool showGroupOption: localFiles.length > 1

    signal filesSelected(var urls)
    signal fileRemovalRequested(int index)
    signal groupingChanged(bool grouped)

    FileDialog {
        id: localFileDialog
        title: qsTr("Selecionar arquivos locais para criptografar com ENC1")
        fileMode: FileDialog.OpenFiles
        onAccepted: selectionRoot.filesSelected(selectedFiles)
    }

    Rectangle {
        visible: selectionRoot.localFiles.length === 0
        Layout.fillWidth: true
        Layout.preferredHeight: 156
        radius: 12
        color: selectionRoot.isDraggingOver ? "#1a8b5cf6" : "transparent"
        border.color: selectionRoot.isDraggingOver ? "#8b5cf6" : "#15ffffff"
        border.width: 2
        Rectangle {
            anchors.fill: parent
            anchors.margins: 1
            color: "transparent"
            border.color: selectionRoot.isDraggingOver ? "transparent" : "#29ffffff"
            border.width: 1
            radius: 11
        }
        DropArea {
            anchors.fill: parent
            onEntered: function(drag) {
                selectionRoot.isDraggingOver = drag.hasUrls
                if (drag.hasUrls) drag.acceptProposedAction()
            }
            onExited: selectionRoot.isDraggingOver = false
            onDropped: function(drop) {
                selectionRoot.filesSelected(drop.urls)
                selectionRoot.isDraggingOver = false
                drop.acceptProposedAction()
            }
        }
        ColumnLayout {
            anchors.centerIn: parent
            spacing: 7
            AppIcon {
                name: "upload-cloud"
                color: selectionRoot.isDraggingOver ? "#a78bfa" : "#8b5cf6"
                Layout.preferredWidth: 38
                Layout.preferredHeight: 38
                Layout.alignment: Qt.AlignHCenter
            }
            Text {
                text: selectionRoot.isDraggingOver ? qsTr("Solte os arquivos aqui") : qsTr("Clique ou arraste arquivos")
                color: "#fffffe"
                font.pixelSize: 13
                font.weight: Font.DemiBold
                Layout.alignment: Qt.AlignHCenter
            }
            Text {
                text: qsTr("Arquivos locais serão criptografados antes de serem anexados.")
                color: "#a7a9be"
                font.pixelSize: 11
                Layout.alignment: Qt.AlignHCenter
                horizontalAlignment: Text.AlignHCenter
            }
            Button {
                id: addFilesButton
                objectName: "notesLocalAddFilesButton"
                Layout.preferredHeight: 30
                enabled: !selectionRoot.waiting
                onClicked: localFileDialog.open()
                Accessible.name: qsTr("Selecionar arquivos locais")
                background: Rectangle {
                    radius: 8
                    color: addFilesButton.hovered ? "#338b5cf6" : "#228b5cf6"
                    border.color: "#668b5cf6"
                }
                contentItem: Text {
                    text: qsTr("Selecionar arquivos")
                    color: "#c4b5fd"
                    font.pixelSize: 11
                    font.weight: Font.DemiBold
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                    leftPadding: 12
                    rightPadding: 12
                }
            }
        }
    }

    ScrollView {
        visible: selectionRoot.localFiles.length > 0
        Layout.fillWidth: true
        Layout.preferredHeight: Math.min(192, selectionRoot.localFiles.length * 52)
        clip: true
        ColumnLayout {
            width: parent.width
            spacing: 4
            Repeater {
                model: selectionRoot.localFiles
                delegate: Rectangle {
                    id: selectedFileRow
                    required property int index
                    required property string modelData
                    Layout.fillWidth: true
                    Layout.preferredHeight: 48
                    radius: 9
                    color: "#0dffffff"
                    border.color: "#0fffffff"
                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: 10
                        anchors.rightMargin: 5
                        spacing: 10
                        Rectangle {
                            Layout.preferredWidth: 32
                            Layout.preferredHeight: 32
                            radius: 8
                            color: "#338b5cf6"
                            AppIcon { anchors.centerIn: parent; name: "file"; color: "#a78bfa"; width: 17; height: 17 }
                        }
                        Text {
                            Layout.fillWidth: true
                            text: PickerOperations.fileNameFromUrl(selectedFileRow.modelData)
                            color: "#fffffe"
                            font.pixelSize: 12
                            font.weight: Font.DemiBold
                            elide: Text.ElideRight
                        }
                        ToolButton {
                            Layout.preferredWidth: 28
                            Layout.preferredHeight: 28
                            enabled: !selectionRoot.waiting && selectionRoot.canRemove
                            Accessible.name: qsTr("Remover %1 da seleção").arg(PickerOperations.fileNameFromUrl(selectedFileRow.modelData))
                            onClicked: selectionRoot.fileRemovalRequested(selectedFileRow.index)
                            contentItem: AppIcon {
                                name: "close"
                                color: parent.enabled ? "#a7a9be" : "#555563"
                                width: 14
                                height: 14
                            }
                        }
                    }
                }
            }
        }
    }

    Button {
        id: addMoreButton
        objectName: "notesLocalAddMoreFilesButton"
        visible: selectionRoot.localFiles.length > 0 && !selectionRoot.waiting
        Layout.fillWidth: true
        Layout.preferredHeight: 34
        enabled: !selectionRoot.waiting
        onClicked: localFileDialog.open()
        background: Rectangle {
            radius: 8
            color: addMoreButton.hovered ? "#0dffffff" : "transparent"
            border.color: "#33ffffff"
            border.width: 1
        }
        contentItem: RowLayout {
            AppIcon { name: "upload"; color: "#a7a9be"; Layout.preferredWidth: 14; Layout.preferredHeight: 14 }
            Text { text: qsTr("Adicionar mais arquivos"); color: "#a7a9be"; font.pixelSize: 11 }
            Item { Layout.fillWidth: true }
        }
    }

    CheckBox {
        visible: selectionRoot.showGroupOption
        text: qsTr("Agrupar arquivos em um único bloco")
        checked: selectionRoot.groupAsBundle
        enabled: !selectionRoot.waiting
        onToggled: selectionRoot.groupingChanged(checked)
        Accessible.name: qsTr("Agrupar arquivos selecionados em um pacote")
    }
}
