package com.synapse.features.video.model

data class VideoLibraryItem(
    val id: String,
    val title: String,
    val originalName: String,
    val filePath: String?,
    val durationSeconds: Double,
    val progressSeconds: Double,
    val isLocal: Boolean,
) {
    val canPlayOnAndroid: Boolean
        get() = filePath?.startsWith(CONTENT_URI_PREFIX) == true

    private companion object {
        const val CONTENT_URI_PREFIX = "content://"
    }
}
