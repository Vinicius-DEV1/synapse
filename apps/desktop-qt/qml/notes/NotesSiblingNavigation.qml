import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

RowLayout {
    id: siblingNavigation

    property var pages: []
    property string pageId: ""

    signal pageSelected(string targetPageId)

    function normalizedParentId(page) {
        var value = page ? page.parent_id : ""
        return value === null || value === undefined || value === "null" ? "" : String(value)
    }

    function comparePages(left, right) {
        var orderDifference = Number(left.sort_order || 0) - Number(right.sort_order || 0)
        if (orderDifference !== 0) return orderDifference
        var titleDifference = String(left.title || "").localeCompare(String(right.title || ""), undefined, { numeric: true, sensitivity: "base" })
        if (titleDifference !== 0) return titleDifference
        return new Date(left.created_at || 0).getTime() - new Date(right.created_at || 0).getTime()
    }

    function siblingAt(offset) {
        var currentPage = null
        for (var index = 0; index < pages.length; ++index) {
            if (pages[index].id === pageId) currentPage = pages[index]
        }
        if (!currentPage) return null

        var currentParentId = normalizedParentId(currentPage)
        var siblings = []
        for (var pageIndex = 0; pageIndex < pages.length; ++pageIndex) {
            var page = pages[pageIndex]
            if (currentPage.is_pinned) {
                if (page.is_pinned) siblings.push(page)
            } else if (normalizedParentId(page) === currentParentId && (currentParentId.length > 0 || !page.is_pinned)) {
                siblings.push(page)
            }
        }
        siblings.sort(function(left, right) {
            if (currentPage.is_pinned) {
                var pinDifference = Number(left.pinned_order || 0) - Number(right.pinned_order || 0)
                if (pinDifference !== 0) return pinDifference
            }
            return comparePages(left, right)
        })

        for (var siblingIndex = 0; siblingIndex < siblings.length; ++siblingIndex) {
            if (siblings[siblingIndex].id === pageId) return siblings[siblingIndex + offset] || null
        }
        return null
    }

    readonly property var previousPage: siblingAt(-1)
    readonly property var nextPage: siblingAt(1)
    readonly property bool isNested: normalizedParentId(pages.filter(function(page) { return page.id === pageId })[0]) !== ""

    spacing: 0

    Rectangle {
        Layout.preferredWidth: 56
        Layout.preferredHeight: 28
        radius: 8
        color: "#0affffff"
        border.color: "#0fffffff"

        RowLayout {
            anchors.fill: parent
            anchors.margins: 2
            spacing: 0

            ToolButton {
                Layout.fillWidth: true
                Layout.fillHeight: true
                enabled: siblingNavigation.previousPage !== null
                text: "‹"
                Accessible.name: qsTr("Previous page")
                onClicked: siblingNavigation.pageSelected(siblingNavigation.previousPage.id)
                ToolTip.visible: hovered
                ToolTip.text: siblingNavigation.previousPage
                              ? qsTr("Previous page: %1").arg(siblingNavigation.previousPage.title || qsTr("Untitled"))
                              : siblingNavigation.isNested ? qsTr("First page in folder") : qsTr("First page")
                background: Rectangle { color: parent.hovered && parent.enabled ? "#14ffffff" : "transparent"; radius: 6 }
                contentItem: Text {
                    text: parent.text
                    color: parent.enabled ? "#a7a9be" : "#40a7a9be"
                    font.pixelSize: 18
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }

            ToolButton {
                Layout.fillWidth: true
                Layout.fillHeight: true
                enabled: siblingNavigation.nextPage !== null
                text: "›"
                Accessible.name: qsTr("Next page")
                onClicked: siblingNavigation.pageSelected(siblingNavigation.nextPage.id)
                ToolTip.visible: hovered
                ToolTip.text: siblingNavigation.nextPage
                              ? qsTr("Next page: %1").arg(siblingNavigation.nextPage.title || qsTr("Untitled"))
                              : siblingNavigation.isNested ? qsTr("Last page in folder") : qsTr("Last page")
                background: Rectangle { color: parent.hovered && parent.enabled ? "#14ffffff" : "transparent"; radius: 6 }
                contentItem: Text {
                    text: parent.text
                    color: parent.enabled ? "#a7a9be" : "#40a7a9be"
                    font.pixelSize: 18
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                }
            }
        }
    }
}
