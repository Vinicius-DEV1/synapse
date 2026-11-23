import QtQuick 2.15
import QtQuick.Dialogs

Item {
    id: dialogsRoot

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
            var text = dataController.readLocalTextFile(cleanPath)
            if (!text || text.length === 0) return

            var parts = cleanPath.split("/")
            var fileName = parts[parts.length - 1] || "Página Importada"
            var dotIdx = fileName.lastIndexOf(".")
            var title = dotIdx > 0 ? fileName.substring(0, dotIdx) : fileName

            var isHtml = /\.html?$/i.test(fileName)
            var htmlBody = isHtml ? text : ("<p>" + text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br/>") + "</p>")

            var newId = dataController.createSubPage(dialogsRoot.importParentId, title, "📄")
            if (newId) {
                dataController.savePage(newId, title, htmlBody, "📄", "")
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
            var p = dataController.getPage(dialogsRoot.exportPageId)
            if (!p || !p.id) return
            var rawPath = selectedFile.toString()
            var cleanPath = rawPath.indexOf("file://") === 0 ? decodeURIComponent(rawPath.substring(7)) : rawPath
            var body = p.content || ""
            if (/\.md$/i.test(cleanPath)) {
                body = "# " + (p.title || "Sem título") + "\n\n" + body.replace(/<\/p>/gi, "\n\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
            } else {
                body = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>" + (p.title || "Página") + "</title></head><body><h1>" + (p.title || "") + "</h1>\n" + body + "\n</body></html>"
            }
            if (dataController.saveLocalTextFile(cleanPath, body)) {
                dialogsRoot.exported(cleanPath)
            }
        }
    }
}
