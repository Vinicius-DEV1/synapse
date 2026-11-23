package com.synapse.features.culture.ui.dialogs

import androidx.annotation.StringRes
import com.synapse.R

internal data class CultureMediaTypeOption(val value: String, @StringRes val label: Int)

internal val CULTURE_MEDIA_TYPES = listOf(
    CultureMediaTypeOption("anime", R.string.culture_type_anime),
    CultureMediaTypeOption("filme", R.string.culture_type_movie),
    CultureMediaTypeOption("série", R.string.culture_type_series),
    CultureMediaTypeOption("hq", R.string.culture_type_comic),
    CultureMediaTypeOption("manga", R.string.culture_type_manga),
    CultureMediaTypeOption("livro", R.string.culture_type_book),
    CultureMediaTypeOption("novel", R.string.culture_type_novel),
)
