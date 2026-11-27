import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15
import "../ui"

Dialog {
    id: deleteDialog
    objectName: "notesDeleteDialog"

    property string noteTitle: ""
    property string errorMessage: ""
    property string pageId: ""
    property string selectedPageId: ""
    property var pageList: []
    property var controller: null
    property string activeContent: ""
    property var activeEvents: []
    property bool isDeleting: false
    readonly property bool hasActiveEvents: activeEvents.length > 0
    readonly property int deletionEventCount: activeEvents.filter(function(event) {
        return Boolean(event && event.willBeDeleted)
    }).length
    readonly property bool hasDeletableEvents: deletionEventCount > 0

    signal confirmed()

    title: hasDeletableEvents ? qsTr("Excluir página com eventos da Agenda") : qsTr("Excluir página")
    modal: true
    focus: true
    anchors.centerIn: parent
    width: Math.min(448, parent ? parent.width - 32 : 448)
    height: Math.min(dialogContent.implicitHeight, parent ? parent.height - 32 : 560)
    padding: 0
    standardButtons: Dialog.NoButton

    background: Rectangle {
        color: "#1a1924"
        border.color: "#2affffff"
        radius: 16
    }

    function openForPage(targetPageId, initialErrorMessage) {
        pageId = String(targetPageId || "")
        errorMessage = String(initialErrorMessage || "")
        isDeleting = false
        activeEvents = collectActiveEvents()
        open()
    }

    function collectActiveEvents() {
        if (!controller || typeof controller.getPageTree !== "function"
                || typeof controller.getCalendarEvents !== "function") return []

        var pages = pageList || []
        if (pages.length === 0) pages = controller.getPageTree("") || []
        var pagesById = ({})
        var childrenByParent = ({})
        for (var i = 0; i < pages.length; ++i) {
            var page = pages[i]
            if (!page || !page.id) continue
            var pageKey = String(page.id)
            pagesById[pageKey] = page
            var parentId = page.parent_id === null || page.parent_id === undefined
                    ? "" : String(page.parent_id)
            if (parentId.length > 0) {
                if (!childrenByParent[parentId]) childrenByParent[parentId] = []
                childrenByParent[parentId].push(pageKey)
            }
        }

        var subtree = ({})
        var stack = pageId.length > 0 ? [pageId] : []
        while (stack.length > 0) {
            var currentId = stack.pop()
            if (subtree[currentId]) continue
            subtree[currentId] = true
            var children = childrenByParent[currentId] || []
            for (var childIndex = 0; childIndex < children.length; ++childIndex)
                stack.push(children[childIndex])
        }

        var allEvents = controller.getCalendarEvents() || []
        var result = []
        var now = Date.now()
        for (var eventIndex = 0; eventIndex < allEvents.length; ++eventIndex) {
            var calendarEvent = allEvents[eventIndex]
            if (!calendarEvent) continue
            var linkedPageId = calendarEvent.page_id === null || calendarEvent.page_id === undefined
                    ? "" : String(calendarEvent.page_id)
            var willBeDeleted = linkedPageId.length > 0 && Boolean(subtree[linkedPageId])
            var linked = willBeDeleted
            var linkedPageTitle = linkedPageId && pagesById[linkedPageId]
                    ? String(pagesById[linkedPageId].title || noteTitle) : noteTitle

            if (!linked) {
                for (var subtreePageId in subtree) {
                    var subtreePage = pagesById[subtreePageId]
                    var content = subtreePageId === selectedPageId ? activeContent
                                : String(subtreePage && subtreePage.content || "")
                    var eventMarker = 'data-event-id="' + String(calendarEvent.id || "") + '"'
                    if (content.length > 0 && eventMarker !== 'data-event-id=""'
                            && content.indexOf(eventMarker) >= 0) {
                        linked = true
                        linkedPageTitle = String(subtreePage && subtreePage.title || noteTitle)
                        break
                    }
                }
            }
            if (!linked) continue

            var expiryValue = calendarEvent.end_date || calendarEvent.start_date || ""
            var expiryTimestamp = expiryValue ? Date.parse(expiryValue) : NaN
            if (!isNaN(expiryTimestamp) && expiryTimestamp < now) continue

            var startValue = calendarEvent.start_date || ""
            var startTimestamp = startValue ? Date.parse(startValue) : NaN
            result.push(Object.assign({}, calendarEvent, {
                pageTitle: linkedPageTitle,
                willBeDeleted: willBeDeleted,
                displayDate: !isNaN(startTimestamp)
                             ? Qt.formatDateTime(new Date(startTimestamp), "dd/MM HH:mm")
                             : qsTr("Sem data")
            }))
        }
        return result
    }

    contentItem: ColumnLayout {
        id: dialogContent
        anchors.fill: parent
        anchors.margins: 24
        spacing: 14

        RowLayout {
            Layout.fillWidth: true
            spacing: 14

            Rectangle {
                Layout.preferredWidth: 40
                Layout.preferredHeight: 40
                radius: 20
                color: deleteDialog.hasDeletableEvents ? "#26f59e0b" : "#1af43f5e"
                AppIcon {
                    anchors.centerIn: parent
                    name: deleteDialog.hasDeletableEvents ? "calendar" : "alert-triangle"
                    color: deleteDialog.hasDeletableEvents ? "#fbbf24" : "#fb7185"
                    width: 20
                    height: 20
                }
            }

            ColumnLayout {
                Layout.fillWidth: true
                spacing: 3
                Text {
                    objectName: "notesDeleteDialogTitle"
                    Layout.fillWidth: true
                    text: deleteDialog.title
                    color: "#ffffff"
                    font.pixelSize: 17
                    font.weight: Font.DemiBold
                    wrapMode: Text.Wrap
                }
                Text {
                    Layout.fillWidth: true
                    text: qsTr("‘%1’ e todas as subpáginas serão movidas para a Lixeira. Você poderá restaurá-las depois.").arg(deleteDialog.noteTitle)
                    color: "#a1a1aa"
                    font.pixelSize: 12
                    wrapMode: Text.Wrap
                }
            }
        }

        NotesDeleteEventsWarning {
            Layout.fillWidth: true
            visible: deleteDialog.hasActiveEvents
            pageName: deleteDialog.noteTitle
            events: deleteDialog.activeEvents
            deletionCount: deleteDialog.deletionEventCount
        }

        Text {
            Layout.fillWidth: true
            visible: deleteDialog.errorMessage.length > 0
            text: deleteDialog.errorMessage
            color: "#fda4af"
            font.pixelSize: 12
            wrapMode: Text.Wrap
        }

        RowLayout {
            Layout.fillWidth: true
            spacing: 12
            Item { Layout.fillWidth: true }

            Button {
                id: cancelButton
                objectName: "notesDeleteCancelButton"
                text: qsTr("Cancelar")
                enabled: !deleteDialog.isDeleting
                onClicked: deleteDialog.reject()
                background: Rectangle {
                    radius: 10
                    color: cancelButton.hovered ? "#0dffffff" : "transparent"
                }
                contentItem: Text {
                    text: cancelButton.text
                    color: "#a1a1aa"
                    font.pixelSize: 13
                    font.weight: Font.Medium
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                    leftPadding: 12
                    rightPadding: 12
                }
            }

            Button {
                id: confirmButton
                objectName: "notesDeleteConfirmButton"
                text: deleteDialog.isDeleting ? qsTr("Excluindo...")
                     : deleteDialog.hasDeletableEvents
                       ? qsTr("Sim, excluir página e %1 evento(s)").arg(deleteDialog.deletionEventCount)
                       : qsTr("Sim, excluir")
                enabled: !deleteDialog.isDeleting
                onClicked: deleteDialog.accept()
                background: Rectangle {
                    radius: 10
                    color: confirmButton.enabled ? (confirmButton.hovered ? "#e11d48" : "#f43f5e") : "#753040"
                }
                contentItem: Text {
                    text: confirmButton.text
                    color: "#ffffff"
                    font.pixelSize: 12
                    font.weight: Font.DemiBold
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                    leftPadding: 12
                    rightPadding: 12
                    elide: Text.ElideRight
                }
            }
        }
    }

    onAccepted: {
        if (isDeleting) return
        isDeleting = true
        confirmed()
        isDeleting = false
    }
    onRejected: {
        errorMessage = ""
    }
}
