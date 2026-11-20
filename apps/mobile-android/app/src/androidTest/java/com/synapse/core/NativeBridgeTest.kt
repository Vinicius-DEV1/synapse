package com.synapse.core

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NativeBridgeTest {
    @Test
    fun generatedUniFfiBindingRunsTheRustFsrsEngine() {
        SynapseFsrs().use { engine ->
            val result = engine.review(
                stability = 0.0,
                difficulty = 0.0,
                state = 0u.toUByte(),
                rating = 3u.toUByte(),
                elapsedDays = 0,
            )

            assertTrue(result.stability > 0.0)
            assertTrue(result.scheduledDays > 0)
        }
    }
}
