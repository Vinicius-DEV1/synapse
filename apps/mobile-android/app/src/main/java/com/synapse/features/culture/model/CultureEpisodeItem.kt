package com.synapse.features.culture.model

data class CultureEpisodeItem(
    val id: String,
    val itemId: String,
    val episodeNumber: Int,
    val seasonNumber: Int?,
    val title: String,
    val isWatched: Boolean,
)
