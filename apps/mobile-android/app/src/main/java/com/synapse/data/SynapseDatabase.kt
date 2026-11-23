package com.synapse.data

import android.content.Context

object SynapseDatabase {
    private const val DATABASE_FILE_NAME = "synapse-finance.sqlite"

    fun path(context: Context): String = context.applicationContext
        .getDatabasePath(DATABASE_FILE_NAME)
        .absolutePath
}
