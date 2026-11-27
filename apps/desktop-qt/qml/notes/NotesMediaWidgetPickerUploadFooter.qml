pragma ComponentBehavior: Bound

import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Rectangle {
    id: footerRoot

    property var upload: null

    signal cancelRequested()
    signal uploadRequested()

    visible: true
    Layout.fillWidth: true
    Layout.preferredHeight: 64
    implicitHeight: 64
    color: "#800f0e17"

    Rectangle {
        anchors.top: parent.top
        width: parent.width
        height: 1
        color: "#0fffffff"
    }

    RowLayout {
        anchors.fill: parent
        anchors.leftMargin: 16
        anchors.rightMargin: 16
        spacing: 12

        Item { Layout.fillWidth: true }

        Button {
            id: cancelUploadButton
            objectName: "notesLocalUploadCancelButton"
            text: qsTr("Cancelar")
            enabled: !footerRoot.upload || !footerRoot.upload.waiting
            onClicked: footerRoot.cancelRequested()
            background: Rectangle {
                radius: 8
                color: cancelUploadButton.hovered ? "#1affffff" : "transparent"
            }
            contentItem: Text {
                text: cancelUploadButton.text
                color: "#a7a9be"
                font.pixelSize: 13
                font.weight: Font.Medium
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
                leftPadding: 16
                rightPadding: 16
            }
        }

        Button {
            id: uploadActionButton
            objectName: "notesLocalUploadActionButton"
            enabled: footerRoot.upload && footerRoot.upload.localFiles.length > 0 && !footerRoot.upload.waiting
            onClicked: footerRoot.uploadRequested()
            background: Rectangle {
                radius: 8
                color: uploadActionButton.enabled ? (uploadActionButton.hovered ? "#7c3aed" : "#8b5cf6") : "#7c8b5cf6"
            }
            contentItem: Text {
                text: !footerRoot.upload ? qsTr("Enviar")
                    : footerRoot.upload.waiting ? qsTr("Criptografando...")
                    : footerRoot.upload.activeFileIndex >= 0 ? qsTr("Tentar novamente")
                    : qsTr("Fazer Upload (%1)").arg(footerRoot.upload.localFiles.length)
                color: footerRoot.upload && footerRoot.upload.localFiles.length > 0 ? "#ffffff" : "#ffffff80"
                font.pixelSize: 13
                font.weight: Font.Medium
                horizontalAlignment: Text.AlignHCenter
                verticalAlignment: Text.AlignVCenter
                leftPadding: 24
                rightPadding: 24
            }
        }
    }
}
