package com.synapse.features.trash.model

data class TrashedItem(
    val id: String,
    val title: String,
    val itemType: String,
    val deletedAt: String,
)

object TrashItemTypes {
    const val PAGE = "page"
    const val ANKI_DECK = "anki_deck"
    const val ANKI_CARD = "anki_card"
    const val FILE = "file"
    const val FINANCE = "finance"
    const val WISHLIST = "wishlist"
    const val VAULT = "vault"
    const val VAULT_ITEM = "vault_item"
    const val VIDEO = "video"
    const val LOFI = "lofi"
    const val BOOK = "book"
    const val CALENDAR = "calendar"
    const val CULTURE = "culture"
    const val HABIT = "habit"
    const val QUIZ_BATTERY = "quiz_battery"
}
