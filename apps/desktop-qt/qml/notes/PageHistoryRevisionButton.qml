import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Button {
    id: revisionCard

    required property var modelData
    required property int index
    property int selectedIndex: 0
    property int historyCount: 0
    property string timestampText: ""
    readonly property string revisionTitle: index === 0
        ? qsTr("Versão Atual") : qsTr("Revisão ") + (historyCount - index)
    readonly property color revisionBorderColor: activeFocus ? "#6d28d9"
        : selectedIndex === index ? "#26ffffff" : "transparent"

    signal revisionSelected(int index)

    implicitHeight: revisionCardContent.implicitHeight + 28
    objectName: "historyRevisionCard-" + index
    focusPolicy: Qt.TabFocus
    padding: 0
    leftPadding: 14
    rightPadding: 14
    topPadding: 14
    bottomPadding: 14
    Accessible.role: Accessible.Button
    Accessible.name: revisionTitle + ", " + timestampText

    onClicked: revisionSelected(index)
    Keys.onReturnPressed: function(event) { activateRevision(event) }
    Keys.onEnterPressed: function(event) { activateRevision(event) }
    Keys.onSpacePressed: function(event) { activateRevision(event) }

    function activateRevision(event) {
        revisionSelected(index)
        event.accepted = true
    }

    background: Rectangle {
        objectName: "historyRevisionCardBackground-" + revisionCard.index
        radius: 12
        color: revisionCard.selectedIndex === revisionCard.index ? "#1affffff"
            : revisionCard.hovered ? "#0dffffff" : "transparent"
        border.color: revisionCard.revisionBorderColor
    }

    contentItem: ColumnLayout {
        id: revisionCardContent
        spacing: 4
        Text {
            objectName: "historyRevisionTitle"
            Layout.fillWidth: true
            text: revisionCard.revisionTitle
            color: revisionCard.selectedIndex === revisionCard.index ? theme.textDark : "#a1a1aa"
            font.pixelSize: 12
            font.weight: Font.DemiBold
        }
        Text {
            objectName: "historyRevisionTimestamp"
            Layout.fillWidth: true
            text: revisionCard.timestampText
            color: revisionCard.selectedIndex === revisionCard.index ? "#d4d4d8" : theme.textMuted
            font.pixelSize: 11
            font.family: theme.fontMono
        }
    }
}
