import QtQuick 2.15
import QtQuick.Layouts 1.15
import ".."

Rectangle {
    id: encImgRoot
    width: Math.min(imageWidth, parent ? parent.width : 400)
    height: imageHeight
    radius: 12
    color: "#0f0e17"
    border.color: "#2e2e38"
    border.width: 1
    clip: true

    property string imageSrc: ""
    property string caption: ""
    property int imageWidth: 420
    property int imageHeight: 260
    readonly property bool isUnlocked: dataController.isVaultUnlocked

    // Image when unlocked
    Image {
        anchors.fill: parent
        visible: encImgRoot.isUnlocked && encImgRoot.imageSrc.length > 0
        source: encImgRoot.isUnlocked ? encImgRoot.imageSrc : ""
        fillMode: Image.PreserveAspectFit
        asynchronous: true
    }

    // Locked Placeholder
    ColumnLayout {
        anchors.centerIn: parent
        visible: !encImgRoot.isUnlocked || encImgRoot.imageSrc.length === 0
        spacing: 8

        Rectangle {
            Layout.preferredWidth: 44
            Layout.preferredHeight: 44
            Layout.alignment: Qt.AlignHCenter
            radius: 10
            color: "#281b38"
            border.color: "#7c3aed"
            border.width: 1

            AppIcon {
                anchors.centerIn: parent
                name: "vault"
                color: "#a78bfa"
                Layout.preferredWidth: 20
                Layout.preferredHeight: 20
            }
        }

        Text {
            text: "Imagem Criptografada"
            color: "#fffffe"
            font.pixelSize: 13
            font.weight: Font.DemiBold
            Layout.alignment: Qt.AlignHCenter
        }

        Text {
            text: "Desbloqueie o cofre para visualizar"
            color: "#6b7280"
            font.pixelSize: 11
            Layout.alignment: Qt.AlignHCenter
        }
    }

    // Caption strip
    Rectangle {
        visible: encImgRoot.caption.length > 0 && encImgRoot.isUnlocked
        anchors.bottom: parent.bottom
        width: parent.width
        height: 28
        color: "#cc0f0e17"

        Text {
            anchors.centerIn: parent
            text: encImgRoot.caption
            color: "#a7a9be"
            font.pixelSize: 11
            elide: Text.ElideRight
        }
    }
}
