package it.trackrs.fittrackr.diary

import it.trackrs.fittrackr.data.DiaryDay
import it.trackrs.fittrackr.data.GymSetRecord
import it.trackrs.fittrackr.data.MealItemRecord
import it.trackrs.fittrackr.data.RecordedGymSession
import it.trackrs.fittrackr.data.RecordedMeal
import it.trackrs.fittrackr.data.RecordedMealEntry
import kotlin.math.roundToInt
import kotlin.time.Instant

data class MealGroup(val moment: MealMoment, val entries: List<RecordedMealEntry>)

private fun entryTime(entry: RecordedMealEntry) =
    runCatching { Instant.parse(entry.entry.createdAt).toEpochMilliseconds() }.getOrDefault(0)

fun mealTimeline(meals: List<RecordedMeal>): List<MealGroup> {
    val entryOrder = compareBy(::entryTime).thenBy { it.entry.id }
    val grouped = meals.groupBy { it.meal.mealType }.mapValues { (_, rows) ->
        rows.flatMap { it.entries }.sortedWith(entryOrder)
    }
    val mainGroups = MealMoment.entries.filter { it != MealMoment.Snack }.mapNotNull { moment ->
        grouped[moment.key]?.takeIf { it.isNotEmpty() }?.let { MealGroup(moment, it) }
    }
    val snacks = List(mainGroups.size + 1) { mutableListOf<RecordedMealEntry>() }
    grouped[MealMoment.Snack.key].orEmpty().forEach { snack ->
        val time = entryTime(snack)
        val previous = mainGroups.indices
            .filter { entryTime(mainGroups[it].entries.first()) <= time }
            .maxWithOrNull(compareBy<Int> { entryTime(mainGroups[it].entries.first()) }.thenBy { it })
        snacks[(previous ?: -1) + 1].add(snack)
    }
    return buildList {
        mainGroups.forEachIndexed { index, group ->
            if (snacks[index].isNotEmpty()) add(MealGroup(MealMoment.Snack, snacks[index]))
            add(group)
        }
        if (snacks.last().isNotEmpty()) add(MealGroup(MealMoment.Snack, snacks.last()))
    }.asReversed().map { it.copy(entries = it.entries.asReversed()) }
}

data class Nutrition(val calories: Double, val proteinG: Double, val carbsG: Double, val fatG: Double)

fun Iterable<MealItemRecord>.nutrition() = Nutrition(
    sumOf { it.calories }, sumOf { it.proteinG }, sumOf { it.carbsG }, sumOf { it.fatG },
)

fun DiaryDay.caloriesBurned(): Double =
    workouts.sumOf { it.caloriesBurned } + gym.sumOf { it.caloriesBurned(bodyWeightKg) }

private fun RecordedGymSession.caloriesBurned(weightKg: Double?): Int {
    if (weightKg == null || !weightKg.isFinite() || weightKg <= 0) return 0
    val completedAt = session.completedAt ?: return 0
    val hours = runCatching {
        (Instant.parse(completedAt) - Instant.parse(session.startedAt)).inWholeMilliseconds / 3_600_000.0
    }.getOrDefault(0.0)
    val done = sets.filter { it.done }
    if (hours <= 0 || done.isEmpty()) return 0
    return (done.map { it.exerciseMet(weightKg) }.average() * weightKg * hours).roundToInt()
}

// Same elapsed-session estimate as the web diary in src/utils/gymSessionSummary.ts.
private fun GymSetRecord.exerciseMet(bodyWeightKg: Double): Double {
    val key = (exerciseKey ?: exerciseName).lowercase()
    val equipmentKey = equipment.lowercase()
    val baseMet = when {
        equipmentKey == "corpo libero" || equipmentKey == "sbarra" -> 3.0
        "squat" in key || "deadlift" in key || "stacco" in key -> 5.0
        else -> 3.5
    }
    val multiplier = if (perSide || equipmentKey == "manubri") 2 else 1
    val loadRatio = ((weightKg ?: 0.0) * multiplier / bodyWeightKg).coerceAtLeast(0.0)
    return (baseMet + (loadRatio * 0.6).coerceAtMost(0.75)).coerceAtMost(6.0)
}
