package it.trackrs.fittrackr.data

import androidx.room.Embedded
import androidx.room.Relation
import it.trackrs.fittrackr.diary.HabitRow

data class RecordedMealEntry(
    @Embedded val entry: MealEntryRecord,
    @Relation(parentColumn = "id", entityColumn = "entryId") val items: List<MealItemRecord>,
)

data class RecordedMeal(
    @Embedded val meal: MealRecord,
    @Relation(parentColumn = "id", entityColumn = "mealId", entity = MealEntryRecord::class)
    val entries: List<RecordedMealEntry>,
)

data class DiaryDay(
    val meals: List<RecordedMeal>,
    val goals: GoalsRecord?,
    val workouts: List<WorkoutRecord>,
    val gym: List<RecordedGymSession>,
    val bodyWeightKg: Double?,
    val habits: List<HabitRow>,
)

data class DiaryDownload(
    val meals: List<MealRecord>,
    val entries: List<MealEntryRecord>,
    val items: List<MealItemRecord>,
    val goals: GoalsRecord?,
    val profile: HealthProfileRecord?,
    val weights: List<WeightRecord>,
    val workouts: List<WorkoutRecord>,
    val gym: List<GymSessionRecord>,
    val sets: List<GymSetRecord>,
)
