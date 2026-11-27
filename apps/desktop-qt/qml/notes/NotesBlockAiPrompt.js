.pragma library

function plainTextFromHtml(value) {
    return String(value || "")
        .replace(/<br\s*\/?\s*>/gi, "\n")
        .replace(/<\/(p|div|li|h[1-6]|tr|blockquote)\s*>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&amp;/gi, "&")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
}

function contextFor(handler) {
    if (typeof handler !== "function") return ""
    var blockType = String(handler.blockType || "")
    var language = String(handler.blockLanguage || "auto")
    var body = blockType === "codeBlock"
        ? String(handler.sourceContent || "")
        : plainTextFromHtml(handler.sourceContent || "")
    var title = String(handler.blockSubtitle || "")
    var kind = blockType === "codeBlock" ? "Bloco de Código"
        : blockType === "blockquote" ? "Callout (Destaque)"
        : blockType === "blockquoteToggle" ? "Toggle Callout (Destaque Recolhível)"
        : "Toggle (Lista Oculta)"
    return "[BLOCO ATUAL]\nTipo: " + kind + (blockType === "codeBlock" ? "\nLinguagem: " + language : "")
        + (title ? "\nTítulo atual: \"" + title + "\"" : "")
        + "\nConteúdo atual do bloco:\n" + (blockType === "codeBlock"
            ? "```" + (language !== "auto" ? language : "") + "\n" + body + "\n```"
            : body)
}

function providerHistory(history) {
    if (!Array.isArray(history)) return []
    var result = []
    for (var i = 0; i < history.length; ++i) {
        var message = history[i]
        if (!message || (message.role !== "user" && message.role !== "assistant")) continue
        result.push({
            role: message.role,
            messageText: String(message.content || "")
        })
    }
    return result
}

function systemInstruction(blockType, language) {
    var surgical = "\n\nDICA DE EDIÇÃO CIRÚRGICA:\nQuando a solicitação alterar apenas trechos pontuais, pode emitir um ou mais blocos neste formato exato:\n<<<<<<< SEARCH\n[trecho exato original existente neste bloco]\n=======\n[novo trecho]\n>>>>>>>\nUse texto original literal, sem alterar espaços ou formatação dentro do trecho de busca."
    if (blockType === "codeBlock") {
        var lang = String(language || "auto")
        var commentRule = lang === "json" ? "JSON padrão não aceita comentários; mantenha JSON estritamente válido."
            : /^(python|py|ruby|rb|bash|sh|shell|yaml|yml|toml|powershell|ps1)$/i.test(lang)
                ? 'Use comentários nativos começando com "#".'
                : /^(sql|pgsql|postgres|postgresql|mysql|sqlite|lua)$/i.test(lang)
                    ? 'Use comentários nativos começando com "--".'
                    : 'Use comentários nativos da linguagem, como // ou /* ... */ quando aplicável.'
        return "Você é um assistente de edição de código do Synapse, responsável exclusivamente pelo código deste bloco. Respeite estritamente a sintaxe da linguagem \"" + lang + "\". Nunca inclua explicações, Markdown ou texto comum dentro do código. Se incluir observações, use comentários nativos: " + commentRule + " Quando devolver uma substituição completa, envie código limpo ou um único bloco de código cercado, sem texto externo." + surgical
    }
    var kind = blockType === "blockquote" ? "callout (destaque)"
        : blockType === "blockquoteToggle" ? "destaque recolhível (toggle callout)"
        : "lista oculta (toggle)"
    var rules = "Você é um assistente de edição responsável exclusivamente por este " + kind + ". Nunca altere, adicione ou remova conteúdo fora deste bloco. Você já está dentro dele: não recrie sua casca externa. O corpo aceita Markdown rico, incluindo parágrafos, listas, títulos, tabelas, citações internas e blocos de código. Apresente a proposta diretamente em Markdown. Se explicar algo antes da proposta, delimite a proposta com uma cerca externa de quatro crases quando ela contiver blocos de código de três crases."
    if (blockType === "toggleBlock" || blockType === "blockquoteToggle")
        rules += ' Para mudar o título, comece a primeira linha com "Título: [Novo Título]".'
    return rules + surgical
}
