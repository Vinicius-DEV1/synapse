import QtQuick 2.15

QtObject {
    id: aiClientRoot

    property var dataController: null

    function hasApiKey() {
        var key = getApiKey()
        return key && key.trim().length > 0
    }

    function getApiKey() {
        if (!dataController) return ""
        return dataController.getConfig("ai_gemini_api_key", "").trim()
    }

    function getModel() {
        if (!dataController) return "gemini-1.5-flash"
        var m = dataController.getConfig("ai_selected_model", "gemini-1.5-flash")
        return (m && m.trim().length > 0) ? m.trim() : "gemini-1.5-flash"
    }

    function getTemperature() {
        if (!dataController) return 0.7
        var t = parseFloat(dataController.getConfig("ai_temperature", "0.7"))
        return (!isNaN(t) && t >= 0.0 && t <= 2.0) ? t : 0.7
    }

    function cleanJson(text) {
        if (!text) return ""
        var cleaned = text.trim()
        if (cleaned.indexOf("```json") === 0) {
            cleaned = cleaned.substring(7)
        } else if (cleaned.indexOf("```") === 0) {
            cleaned = cleaned.substring(3)
        }
        if (cleaned.lastIndexOf("```") === cleaned.length - 3) {
            cleaned = cleaned.substring(0, cleaned.length - 3)
        }
        return cleaned.trim()
    }

    // Sends an asynchronous chat prompt to Google Gemini
    function promptText(systemPrompt, userPrompt, history, callback) {
        if (!hasApiKey()) {
            callback(false, "", "Chave de API do Gemini não configurada. Configure sua chave em Configurações > Inteligência Artificial.")
            return null
        }

        var key = getApiKey()
        var model = getModel()
        var temp = getTemperature()

        var contents = []
        if (systemPrompt && systemPrompt.trim().length > 0) {
            contents.push({
                role: "user",
                parts: [{ text: "System Instructions: " + systemPrompt }]
            })
            contents.push({
                role: "model",
                parts: [{ text: "Entendido. Seguirei rigorosamente estas instruções pedagógicas e contextuais." }]
            })
        }

        if (Array.isArray(history)) {
            for (var i = 0; i < history.length; i++) {
                var item = history[i]
                var role = item.role === "user" ? "user" : "model"
                var msgText = item.messageText || item.text || ""
                if (msgText.trim().length > 0) {
                    contents.push({
                        role: role,
                        parts: [{ text: msgText }]
                    })
                }
            }
        }

        contents.push({
            role: "user",
            parts: [{ text: userPrompt }]
        })

        var payload = {
            contents: contents,
            generationConfig: {
                temperature: temp,
                maxOutputTokens: 2048
            }
        }

        var xhr = new XMLHttpRequest()
        var url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent"
        xhr.open("POST", url)
        xhr.setRequestHeader("Content-Type", "application/json")
        xhr.setRequestHeader("x-goog-api-key", key)

        xhr.onreadystatechange = function() {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                if (xhr.status === 200) {
                    try {
                        var res = JSON.parse(xhr.responseText)
                        if (res.candidates && res.candidates.length > 0 &&
                            res.candidates[0].content && res.candidates[0].content.parts &&
                            res.candidates[0].content.parts.length > 0) {
                            var text = res.candidates[0].content.parts[0].text
                            callback(true, text, "")
                        } else {
                            callback(false, "", "Resposta vazia retornada pelo provedor de IA.")
                        }
                    } catch (e) {
                        callback(false, "", "Erro ao processar resposta JSON da IA: " + e.message)
                    }
                } else {
                    var err = "Erro " + xhr.status + " na API Gemini"
                    try {
                        var errObj = JSON.parse(xhr.responseText)
                        if (errObj.error && errObj.error.message) {
                            err += ": " + errObj.error.message
                        }
                    } catch (ignore) {}
                    callback(false, "", err)
                }
            }
        }

        xhr.send(JSON.stringify(payload))
        return xhr
    }

    // Requests structured JSON output from Google Gemini
    function promptStructured(systemPrompt, userPrompt, callback) {
        var structuredPrompt = userPrompt + "\n\nIMPORTANTE: Responda APENAS com um objeto ou array JSON válido, sem qualquer bloco de texto introdutório, conclusivo ou formatação markdown adicional."
        promptText(systemPrompt, structuredPrompt, [], function(success, rawText, errorMsg) {
            if (!success) {
                callback(false, null, errorMsg)
                return
            }
            try {
                var cleaned = cleanJson(rawText)
                var parsed = JSON.parse(cleaned)
                callback(true, parsed, "")
            } catch (e) {
                callback(false, null, "Falha ao decodificar JSON da IA: " + e.message + "\nConteúdo: " + rawText)
            }
        })
    }

    // Real open metadata lookup via Google Books API
    function queryBookMetadata(title, author, callback) {
        var query = "intitle:" + encodeURIComponent(title || "")
        if (author && author.trim().length > 0 && author !== "Autor Desconhecido") {
            query += "+inauthor:" + encodeURIComponent(author)
        }

        var xhr = new XMLHttpRequest()
        var url = "https://www.googleapis.com/books/v1/volumes?q=" + query + "&maxResults=1"
        xhr.open("GET", url)

        xhr.onreadystatechange = function() {
            if (xhr.readyState === XMLHttpRequest.DONE) {
                if (xhr.status === 200) {
                    try {
                        var res = JSON.parse(xhr.responseText)
                        if (res.items && res.items.length > 0 && res.items[0].volumeInfo) {
                            var info = res.items[0].volumeInfo
                            var enriched = {
                                title: info.title || title,
                                author: (info.authors && info.authors.length > 0) ? info.authors.join(", ") : author,
                                description: info.description || "Descrição indisponível no Google Books.",
                                tags: (info.categories && info.categories.length > 0) ? info.categories.join(", ") : "Geral, Referência",
                                language: info.language || "pt-BR",
                                readingTimeMinutes: (info.pageCount ? Math.round(info.pageCount * 1.5) : 180),
                                publisher: info.publisher || "",
                                publishedDate: info.publishedDate || ""
                            }
                            callback(true, enriched, "")
                            return
                        }
                    } catch (e) {
                        callback(false, null, "Erro ao analisar dados do Google Books: " + e.message)
                        return
                    }
                }
                callback(false, null, "Nenhum metadado encontrado no Google Books.")
            }
        }

        xhr.send()
    }
}
