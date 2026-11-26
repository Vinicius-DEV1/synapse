.pragma library

function extract(rawResponse) {
    var response = String(rawResponse || "").trim()
    var proposalMatch = /```(?:markdown|md)\s*\r?\n([\s\S]*?)\r?\n```/i.exec(response)
    if (!proposalMatch) return { answer: response, proposal: "" }

    var answer = (response.slice(0, proposalMatch.index) + response.slice(proposalMatch.index + proposalMatch[0].length)).trim()
    return {
        answer: answer || "A IA preparou uma proposta de atualização para o documento.",
        proposal: proposalMatch[1]
    }
}
