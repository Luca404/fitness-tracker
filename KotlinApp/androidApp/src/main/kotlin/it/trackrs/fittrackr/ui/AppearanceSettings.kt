package it.trackrs.fittrackr.ui

import android.content.Context
import androidx.annotation.StringRes
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import it.trackrs.fittrackr.R

internal enum class AppStyle(
    val key: String,
    @param:StringRes val title: Int,
    @param:StringRes val description: Int,
    val light: Boolean = false,
) {
    Diary("diary", R.string.style_diary, R.string.style_diary_description),
    Essential("essential", R.string.style_essential, R.string.style_essential_description),
    Playful("playful", R.string.style_playful, R.string.style_playful_description),
    Notebook("notebook", R.string.style_notebook, R.string.style_notebook_description, light = true),
}

internal class AppearanceSettings(context: Context) {
    private val preferences = context.getSharedPreferences("appearance", Context.MODE_PRIVATE)
    private val current = MutableStateFlow(
        AppStyle.entries.find { it.key == preferences.getString("style", null) } ?: AppStyle.Diary,
    )
    val style = current.asStateFlow()

    fun select(style: AppStyle) {
        if (style == current.value) return
        preferences.edit().putString("style", style.key).apply()
        current.value = style
    }
}
