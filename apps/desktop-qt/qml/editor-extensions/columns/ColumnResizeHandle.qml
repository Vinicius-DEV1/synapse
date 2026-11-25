import QtQuick 2.15
import QtQuick.Layouts 1.15

// Interactive column resize divider with live percentage badge mirroring GroupShell.tsx / ColumnGroup.tsx.
Rectangle {
    id: handleRoot

    required property int columnIndex
    required property real containerWidth
    required property var columnWidths
    property bool groupHovered: false

    signal widthsPreviewed(var nextWidths)
    signal widthsCommitted(var nextWidths)

    Layout.preferredWidth: dividerHover.hovered || dividerDrag.pressed ? 3 : 1
    Layout.fillHeight: true
    Layout.leftMargin: 10
    Layout.rightMargin: 10
    radius: 1.5
    color: dividerHover.hovered || dividerDrag.pressed ? "#8b5cf6" : (groupHovered ? "#26ffffff" : "#0dffffff")
    Behavior on color { ColorAnimation { duration: 140 } }

    HoverHandler { id: dividerHover }

    MouseArea {
        id: dividerDrag
        anchors.fill: parent
        anchors.leftMargin: -6
        anchors.rightMargin: -6
        cursorShape: Qt.SplitHCursor
        property real startGlobalX: 0
        property var startWidths: []

        onPressed: function(mouse) {
            startGlobalX = mapToGlobal(mouse.x, 0).x
            startWidths = (handleRoot.columnWidths || []).slice()
        }
        onPositionChanged: function(mouse) {
            if (!pressed || handleRoot.containerWidth <= 0 || startWidths.length <= handleRoot.columnIndex) return
            var dxPct = ((mapToGlobal(mouse.x, 0).x - startGlobalX) / handleRoot.containerWidth) * 100.0
            var w = startWidths.slice()
            var pairSum = w[handleRoot.columnIndex - 1] + w[handleRoot.columnIndex]
            var nextLeft = Math.max(15, Math.min(pairSum - 15, w[handleRoot.columnIndex - 1] + dxPct))
            w[handleRoot.columnIndex - 1] = Math.round(nextLeft * 10) / 10
            w[handleRoot.columnIndex] = Math.round((pairSum - nextLeft) * 10) / 10
            handleRoot.widthsPreviewed(w)
        }
        onReleased: handleRoot.widthsCommitted(handleRoot.columnWidths)
    }

    // Live floating "42% · 58%" pill during drag
    Rectangle {
        visible: dividerDrag.pressed && handleRoot.columnWidths.length > handleRoot.columnIndex
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.top: parent.top
        anchors.topMargin: 8
        z: 40
        width: badgeLabel.implicitWidth + 14
        height: 22
        radius: 6
        color: "#ee0f0e17"
        border.color: "#8b5cf6"
        border.width: 1

        Text {
            id: badgeLabel
            anchors.centerIn: parent
            text: handleRoot.columnWidths.length > handleRoot.columnIndex
                ? Math.round(handleRoot.columnWidths[handleRoot.columnIndex - 1]) + "% · " + Math.round(handleRoot.columnWidths[handleRoot.columnIndex]) + "%"
                : ""
            color: "#e2e8f0"
            font.pixelSize: 10
            font.family: "monospace"
            font.bold: true
        }
    }
}
