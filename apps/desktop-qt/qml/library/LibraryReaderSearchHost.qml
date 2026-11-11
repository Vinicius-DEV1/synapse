import QtQuick 2.15

Item {
    id: searchHost
    anchors.fill: parent

    property var controller: null
    property string temporaryPath: ""
    property string format: ""
    readonly property bool searchOpen: searchDialog.visible

    signal jumpRequested(int pageNumber)

    function openSearch() {
        searchDialog.openFor(temporaryPath, format)
    }

    function closeSearch() {
        searchDialog.close()
    }

    LibraryReaderSearchDialog {
        id: searchDialog
        anchors.centerIn: parent
        controller: searchHost.controller
        onJumpRequested: function(pageNumber) { searchHost.jumpRequested(pageNumber) }
    }

    Connections {
        target: searchHost.controller
        function onLibraryBookSearchReady(result) {
            if (!searchDialog.visible || Number(result.requestId) !== searchDialog.requestId) return
            searchDialog.isSearching = false
            if (!result.success) {
                searchDialog.errorMessage = result.error || "Book search failed."
                return
            }
            searchDialog.results = result.results || []
            searchDialog.totalMatches = Number(result.totalMatches) || 0
            searchDialog.truncated = Boolean(result.truncated)
        }
    }
}
