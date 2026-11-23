import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: pdfRoot

    property var controller: null
    property string temporaryPath: ""
    property int totalPages: 0
    property int currentPage: 1
    property real zoomScale: 1.0
    property var highlights: []

    property var pageUrls: ({})
    property var pagePaths: ({})
    property var renderQueue: []
    property int activeRenderPage: 0
    property bool isSyncingScroll: false

    signal pageScrolled(int pageNumber)

    function resetPages() {
        for (var k in pagePaths) {
            if (pagePaths[k] && controller) controller.closeLibraryBook(pagePaths[k])
        }
        pageUrls = ({})
        pagePaths = ({})
        renderQueue = []
        activeRenderPage = 0
    }

    function enqueuePage(pageNumber) {
        if (pageNumber < 1 || pageNumber > totalPages || temporaryPath.length === 0) return
        if (pageUrls[pageNumber] || activeRenderPage === pageNumber) return
        if (renderQueue.indexOf(pageNumber) !== -1) return
        var q = renderQueue.slice()
        q.push(pageNumber)
        renderQueue = q
        pumpQueue()
    }

    function pumpQueue() {
        if (activeRenderPage > 0 || renderQueue.length === 0 || !controller) return
        if (controller.fileOperationRunning) return
        var nextPage = renderQueue[0]
        renderQueue = renderQueue.slice(1)
        activeRenderPage = nextPage
        var targetWidth = Math.max(640, Math.min(1800, Math.floor(width * zoomScale)))
        controller.renderLibraryPdfPage(temporaryPath, nextPage, targetWidth)
    }

    function handlePageReady(result) {
        if (Number(result.pageNumber || 0) === activeRenderPage) {
            activeRenderPage = 0
        }
        if (result.success && result.pageNumber && result.url) {
            var p = Number(result.pageNumber)
            var nextUrls = Object.assign({}, pageUrls)
            nextUrls[p] = result.url
            pageUrls = nextUrls
            var nextPaths = Object.assign({}, pagePaths)
            nextPaths[p] = result.path || ""
            pagePaths = nextPaths
        }
        Qt.callLater(pumpQueue)
    }

    function scrollToPage(pageNumber) {
        if (pageNumber < 1 || pageNumber > totalPages) return
        isSyncingScroll = true
        pdfListView.positionViewAtIndex(pageNumber - 1, ListView.Beginning)
        enqueuePage(pageNumber)
        if (pageNumber + 1 <= totalPages) enqueuePage(pageNumber + 1)
        isSyncingScroll = false
    }

    function highlightsForPage(pageNum) {
        if (!highlights || highlights.length === 0) return []
        return highlights.filter(function(h) { return Number(h.page_number || 0) === pageNum })
    }

    onZoomScaleChanged: {
        resetPages()
        enqueuePage(currentPage)
    }
    onTemporaryPathChanged: resetPages()

    ListView {
        id: pdfListView
        anchors.fill: parent
        anchors.margins: 12
        spacing: 18
        clip: true
        model: Math.max(0, pdfRoot.totalPages)
        cacheBuffer: 1200

        onContentYChanged: {
            if (pdfRoot.isSyncingScroll || pdfListView.count === 0) return
            var idx = pdfListView.indexAt(width / 2, contentY + height * 0.25)
            if (idx >= 0) {
                var visiblePage = idx + 1
                pdfRoot.enqueuePage(visiblePage)
                if (visiblePage + 1 <= pdfRoot.totalPages) pdfRoot.enqueuePage(visiblePage + 1)
                if (visiblePage !== pdfRoot.currentPage) {
                    pdfRoot.pageScrolled(visiblePage)
                }
            }
        }

        delegate: ColumnLayout {
            id: pageItem
            required property int index
            readonly property int pageNumber: index + 1
            readonly property string imgUrl: pdfRoot.pageUrls[pageNumber] || ""
            readonly property var pageHighlights: pdfRoot.highlightsForPage(pageNumber)
            width: pdfListView.width
            spacing: 6

            Component.onCompleted: pdfRoot.enqueuePage(pageNumber)

            Rectangle {
                Layout.alignment: Qt.AlignHCenter
                width: Math.max(320, Math.min(pageItem.width - 24, 920 * pdfRoot.zoomScale))
                height: pageImg.status === Image.Ready && pageImg.implicitWidth > 0
                    ? Math.round(width * (pageImg.implicitHeight / pageImg.implicitWidth))
                    : Math.round(width * 1.38)
                radius: 8
                color: "#09080f"
                border.color: pageItem.pageNumber === pdfRoot.currentPage ? "#448b5cf6" : "#15ffffff"

                Image {
                    id: pageImg
                    anchors.fill: parent
                    anchors.margins: 2
                    visible: pageItem.imgUrl.length > 0
                    source: pageItem.imgUrl
                    asynchronous: true
                    cache: false
                    fillMode: Image.PreserveAspectFit
                }

                BusyIndicator {
                    anchors.centerIn: parent
                    running: pageItem.imgUrl.length === 0
                    visible: running
                }

                Rectangle {
                    anchors.top: parent.top
                    anchors.right: parent.right
                    anchors.margins: 10
                    width: pageBadgeText.implicitWidth + 14
                    height: 22
                    radius: 6
                    color: "#b311101a"
                    border.color: "#22ffffff"
                    Text {
                        id: pageBadgeText
                        anchors.centerIn: parent
                        text: "Pág. " + pageItem.pageNumber
                        color: "#c4c5d4"
                        font.pixelSize: 10
                        font.bold: true
                    }
                }

                // Visual margin badge indicating saved highlights on this page
                Rectangle {
                    anchors.top: parent.top
                    anchors.left: parent.left
                    anchors.margins: 10
                    visible: pageItem.pageHighlights.length > 0
                    width: hlBadgeText.implicitWidth + 16
                    height: 22
                    radius: 6
                    color: "#33eab308"
                    border.color: "#80eab308"
                    Text {
                        id: hlBadgeText
                        anchors.centerIn: parent
                        text: "🖍 " + pageItem.pageHighlights.length + " destaque(s)"
                        color: "#fde047"
                        font.pixelSize: 10
                        font.bold: true
                    }
                }
            }
        }
    }
}
