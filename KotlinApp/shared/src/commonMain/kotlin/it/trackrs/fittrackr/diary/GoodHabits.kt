package it.trackrs.fittrackr.diary

import it.trackrs.fittrackr.data.MealItemRecord

private const val ETHANOL_GRAMS_PER_UNIT = 12

class HabitEvaluator(
    private val catalog: HabitCatalog,
    private val normalizeName: (String) -> String,
) {
    fun evaluate(
        dayItems: List<MealItemRecord>,
        earlierWeekItems: List<MealItemRecord>,
        age: Int,
        sex: String,
        calorieTarget: Int,
    ): List<HabitRow> {
        val today = dayItems.map(::classify)
        val week = earlierWeekItems.map(::classify) + today
        val targets = catalog.targets
        val alcoholTarget = when {
            age < 18 -> 0.0
            age >= 65 -> targets.olderAdultAlcoholGrams
            sex == "male" -> targets.adultMaleAlcoholGrams
            else -> targets.adultFemaleAlcoholGrams
        } / ETHANOL_GRAMS_PER_UNIT
        return listOf(
            HabitRow(FoodHabit.Vegetables, today.grams("vegetable"), targets.vegetables),
            HabitRow(FoodHabit.Fruit, today.grams("fruit"), targets.fruit),
            HabitRow(FoodHabit.Legumes, week.grams("legume"), targets.legumes),
            HabitRow(FoodHabit.Fish, week.grams("fish"), targets.fish),
            nutrient(FoodHabit.Fiber, dayItems.map { it.fiberG }, targets.fiber),
            nutrient(FoodHabit.Sugars, dayItems.map { it.sugarsG }, calorieTarget * targets.sugarEnergyPercent / 100 / 4),
            alcohol(today, alcoholTarget),
            nutrient(FoodHabit.Salt, dayItems.map { it.saltG }, targets.salt),
        )
    }

    private fun classify(item: MealItemRecord): HabitIngredient {
        val category = item.category.takeUnless { it.isEmpty() || it == "other" }
        val match = if (category == null || item.foodKey == null) {
            catalog.foodsByName[normalizeName(item.foodName)]
        } else null
        val key = item.foodKey ?: match?.key
        val abv = (item.alcoholAbv ?: key?.let(catalog.alcoholStrengths::get))?.takeIf { it in 0.0..100.0 }
        return HabitIngredient(item, category ?: match?.category.orEmpty(), abv)
    }
}

private data class HabitIngredient(val item: MealItemRecord, val category: String, val abv: Double?)

private fun List<HabitIngredient>.grams(category: String): Double =
    sumOf { if (it.category == category && it.item.unit == "g") it.item.quantity else 0.0 }

private fun nutrient(habit: FoodHabit, values: List<Double?>, target: Double): HabitRow {
    val known = values.filterNotNull()
    return HabitRow(habit, known.takeIf { it.isNotEmpty() }?.sum(), target, known.isNotEmpty() && known.size < values.size)
}

private fun alcohol(ingredients: List<HabitIngredient>, target: Double): HabitRow {
    val drinks = ingredients.filter { it.category == "alcohol" || (it.abv ?: 0.0) > 0 }
    if (drinks.isEmpty()) return HabitRow(FoodHabit.Alcohol, 0.0, target)
    return nutrient(FoodHabit.Alcohol, drinks.map { drink ->
        val (item, _, abv) = drink
        when {
            abv == 0.0 -> 0.0
            abv != null && item.unit == "ml" && item.quantity.isFinite() && item.quantity >= 0 ->
                item.quantity * abv / 100 * 0.789 / ETHANOL_GRAMS_PER_UNIT
            else -> null
        }
    }, target)
}
