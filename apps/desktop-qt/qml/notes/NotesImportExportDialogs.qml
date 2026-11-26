import QtQuick 2.15
import QtQuick.Dialogs
import "NotesHtmlEscaping.js" as HtmlEscaping

Item {
    id: dialogsRoot

    property var controller: null
    property string importParentId: ""
    property string exportPageId: ""

    signal imported(string newPageId)
    signal exported(string filePath)

    function openImport(parentId) {
        importParentId = parentId || ""
        importFileDialog.open()
    }

    function openExport(pageId) {
        exportPageId = pageId || ""
        if (!exportPageId) return
        exportFileDialog.open()
    }

    FileDialog {
        id: importFileDialog
        title: qsTr("Importar página (.md, .html, .txt)")
        nameFilters: ["Notas (*.md *.markdown *.html *.htm *.txt)", "Todos (*.*)"]
        onAccepted: {
            var rawPath = selectedFile.toString()
            var cleanPath = rawPath.indexOf("file://") === 0 ? decodeURIComponent(rawPath.substring(7)) : rawPath
            var ctrl = dialogsRoot.controller || dataController
            var text = ctrl.readLocalTextFile(cleanPath)
            if (!text || text.length === 0) return

            var parts = cleanPath.split("/")
            var fileName = parts[parts.length - 1] || "Página Importada"
            var dotIdx = fileName.lastIndexOf(".")
            var title = dotIdx > 0 ? fileName.substring(0, dotIdx) : fileName

            var isHtml = /\.html?$/i.test(fileName)
            var htmlBody = text
            if (!isHtml) {
                var escapedText = HtmlEscaping.escapeHtmlText(text)
                htmlBody = "<p>" + escapedText.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br/>") + "</p>"
            }

            var ctrl = dialogsRoot.controller || dataController
            var newId = ctrl.createSubPage(dialogsRoot.importParentId, title, "📄")
            if (newId) {
                ctrl.savePage(newId, title, htmlBody, "📄", "")
                dialogsRoot.imported(newId)
            }
        }
    }

    FileDialog {
        id: exportFileDialog
        fileMode: FileDialog.SaveFile
        title: qsTr("Exportar página")
        nameFilters: ["HTML (*.html)", "Markdown (*.md)"]
        onAccepted: {
            var ctrl = dialogsRoot.controller || dataController
            var p = ctrl.getPage(dialogsRoot.exportPageId)
            if (!p || !p.id) return
            var rawPath = selectedFile.toString()
            var cleanPath = rawPath.indexOf("file://") === 0 ? decodeURIComponent(rawPath.substring(7)) : rawPath
            var body = p.content || ""
            if (/\.md$/i.test(cleanPath)) {
                body = "# " + (p.title || "Sem título") + "\n\n" + body.replace(/<\/p>/gi, "\n\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
            } else {
                var safeTitle = HtmlEscaping.escapeHtmlText(p.title || "")
                body = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>" + safeTitle + "</title></head><body><h1>" + safeTitle + "</h1>\n" + body + "\n</body></html>"
            }
            if (ctrl.saveLocalTextFile(cleanPath, body)) {
                dialogsRoot.exported(cleanPath)
            }
        }
    }
}
