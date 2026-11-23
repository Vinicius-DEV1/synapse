package com.synapse.features.trash.ui.components

import com.synapse.features.trash.model.TrashItemTypes

enum class TrashFilter(val label: String, val itemTypes: Set<String>?) {
    ALL("Todos os Itens", null),
    NOTES("Notas", setOf(TrashItemTypes.PAGE)),
    FLASHCARDS("Flashcards", setOf(TrashItemTypes.ANKI_DECK, TrashItemTypes.ANKI_CARD)),
    FILES("Arquivos", setOf(TrashItemTypes.FILE)),
    FINANCE("Financeiro", setOf(TrashItemTypes.FINANCE, TrashItemTypes.WISHLIST)),
    VAULT("Cofre", setOf(TrashItemTypes.VAULT, TrashItemTypes.VAULT_ITEM)),
    LOFI("Lofi", setOf(TrashItemTypes.LOFI)),
}
