package it.trackrs.fittrackr.data

import android.content.Context
import it.trackrs.fittrackr.R
import it.trackrs.fittrackr.diary.HabitCatalog
import it.trackrs.fittrackr.diary.HabitEvaluator
import java.text.Normalizer
import kotlinx.serialization.json.Json

internal fun loadHabitEvaluator(context: Context): HabitEvaluator {
    val catalog = context.resources.openRawResource(R.raw.habit_catalog).bufferedReader().use {
        Json.decodeFromString<HabitCatalog>(it.readText())
    }
    return HabitEvaluator(catalog, ::normalizeIngredientName)
}

private val accents = Regex("[\\u0300-\\u036f]")
private val parentheses = Regex("\\([^)]*\\)")
private val separators = Regex("[^a-z0-9]+")
private val qualifiers = Regex("\\b(cotto|cotta|cotti|cotte|crudo|cruda|fresco|fresca|freschi|fresche|sgocciolato)\\b")
private val whitespace = Regex("\\s+")
private val aliases = mapOf(
    "olio evo" to "olio extravergine oliva",
    "olio extravergine di oliva" to "olio extravergine oliva",
    "petto di pollo" to "pollo",
    "petto pollo" to "pollo",
    "pomodoro fresco" to "pomodoro",
    "pomodori freschi" to "pomodoro",
)

// Keep legacy meal lookup in step with src/utils/ingredientMatching.ts.
private fun normalizeIngredientName(name: String): String {
    val normalized = Normalizer.normalize(name, Normalizer.Form.NFD)
        .replace(accents, "")
        .lowercase()
        .replace(parentheses, " ")
        .replace(separators, " ")
        .replace(qualifiers, " ")
        .replace(whitespace, " ")
        .trim()
    return aliases[normalized] ?: normalized
}
