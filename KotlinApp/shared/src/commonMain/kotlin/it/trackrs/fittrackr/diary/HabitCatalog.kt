package it.trackrs.fittrackr.diary

import kotlinx.serialization.Serializable

@Serializable
data class HabitCatalog(
    val foodsByName: Map<String, HabitCatalogFood>,
    val alcoholStrengths: Map<String, Double>,
    val targets: HabitTargets,
)

@Serializable
data class HabitCatalogFood(val key: String, val category: String)

@Serializable
data class HabitTargets(
    val vegetables: Double,
    val fruit: Double,
    val legumes: Double,
    val fish: Double,
    val fiber: Double,
    val sugarEnergyPercent: Double,
    val salt: Double,
    val adultMaleAlcoholGrams: Double,
    val adultFemaleAlcoholGrams: Double,
    val olderAdultAlcoholGrams: Double,
)
