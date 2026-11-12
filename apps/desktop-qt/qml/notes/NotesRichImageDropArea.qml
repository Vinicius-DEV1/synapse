import QtQuick 2.15

DropArea {
    id: imageDropArea
    objectName: "notesRichImageDropArea"

    property var editorRoot
    property var textEditor
    property bool active: false

    function localFilePath(url) {
        if (!url) return ""
        if (typeof url.toLocalFile === "function") return String(url.toLocalFile())
        var encodedPath = String(url)
        if (!encodedPath.startsWith("file://")) return ""
        var localPath = encodedPath.replace(/^file:\/\//i, "")
        try {
            localPath = decodeURIComponent(localPath)
        } catch (error) {
            console.warn("[Notes] Could not decode a dropped local image URL", error)
            return ""
        }
        return /^\/[A-Za-z]:[/\\]/.test(localPath) ? localPath.substring(1) : localPath
    }

    function supportedLocalImageUrl(url) {
        var localPath = localFilePath(url)
        return localPath.length > 0 && /\.(png|jpe?g|gif|webp|bmp)$/i.test(localPath)
    }

    function positionForPoint(x, y) {
        var editorPoint = mapToItem(textEditor, Number(x), Number(y))
        return textEditor.positionAt(editorPoint.x, editorPoint.y)
    }

    function handleImageDrop(urls, x, y) {
        if (!active || !editorRoot || !textEditor || !urls) return false
        var imageUrls = []
        for (var index = 0; index < urls.length; ++index) {
            var fileUrl = urls[index]
            if (!supportedLocalImageUrl(fileUrl)) continue
            imageUrls.push(fileUrl)
        }
        if (imageUrls.length === 0) return false
        var position = positionForPoint(x, y)
        if (position < 0) return false
        editorRoot.importDroppedImages(imageUrls, position)
        return true
    }

    onDropped: function(drop) {
        if (!drop.hasUrls || !handleImageDrop(drop.urls, drop.x, drop.y)) return
        if ((drop.supportedActions & Qt.CopyAction) !== 0) drop.accept(Qt.CopyAction)
        else drop.acceptProposedAction()
    }
}
