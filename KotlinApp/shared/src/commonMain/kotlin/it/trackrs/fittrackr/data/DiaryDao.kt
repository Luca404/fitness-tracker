package it.trackrs.fittrackr.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import it.trackrs.fittrackr.diary.HabitEvaluator
import kotlinx.coroutines.flow.Flow

@Dao
internal abstract class DiaryDao {
    @Query("SELECT * FROM diary_download WHERE id = 0")
    abstract fun observeDownload(): Flow<DownloadRecord?>

    @Transaction
    open suspend fun readDay(date: String, weekStart: String, habits: HabitEvaluator): DiaryDay {
        val meals = mealsOn(date)
        val goals = goals()
        val profile = profile()
        return DiaryDay(
            meals = meals,
            goals = goals,
            workouts = workoutsOn(date),
            gym = gymOn(date),
            bodyWeightKg = latestWeight(date) ?: profile?.weightKg,
            habits = habits.evaluate(
                meals.flatMap { meal -> meal.entries.flatMap { it.items } },
                earlierWeekItems(weekStart, date),
                age = profile?.age ?: 18,
                sex = profile?.sex ?: "female",
                calorieTarget = goals?.calorieTarget ?: 2000,
            ),
        )
    }

    @Transaction
    open suspend fun replace(download: DiaryDownload, record: DownloadRecord) {
        clearMeals()
        clearGoals()
        clearProfile()
        clearWeights()
        clearWorkouts()
        clearGym()
        insertMeals(download.meals)
        insertEntries(download.entries)
        insertItems(download.items)
        download.goals?.let { insertGoals(it) }
        download.profile?.let { insertProfile(it) }
        insertWeights(download.weights)
        insertWorkouts(download.workouts)
        insertGym(download.gym)
        insertSets(download.sets)
        markDownloaded(record)
    }

    @Transaction
    @Query("SELECT * FROM meals WHERE date = :date")
    protected abstract suspend fun mealsOn(date: String): List<RecordedMeal>
    @Query("SELECT * FROM user_goals LIMIT 1")
    protected abstract suspend fun goals(): GoalsRecord?
    @Query("SELECT * FROM workouts WHERE date = :date")
    protected abstract suspend fun workoutsOn(date: String): List<WorkoutRecord>
    @Transaction
    @Query("SELECT * FROM gym_sessions WHERE date = :date")
    protected abstract suspend fun gymOn(date: String): List<RecordedGymSession>
    @Query("SELECT weightKg FROM weight_logs WHERE date <= :date ORDER BY date DESC LIMIT 1")
    protected abstract suspend fun latestWeight(date: String): Double?
    @Query("SELECT * FROM user_health_profiles LIMIT 1")
    protected abstract suspend fun profile(): HealthProfileRecord?
    @Query(
        """
        SELECT item.* FROM meals AS meal
        JOIN meal_entries AS entry ON entry.mealId = meal.id
        JOIN meal_items AS item ON item.entryId = entry.id
        WHERE meal.date >= :weekStart AND meal.date < :date AND item.unit = 'g'
        """,
    )
    protected abstract suspend fun earlierWeekItems(weekStart: String, date: String): List<MealItemRecord>

    @Query("DELETE FROM meals")
    protected abstract suspend fun clearMeals()
    @Query("DELETE FROM user_goals")
    protected abstract suspend fun clearGoals()
    @Query("DELETE FROM user_health_profiles")
    protected abstract suspend fun clearProfile()
    @Query("DELETE FROM weight_logs")
    protected abstract suspend fun clearWeights()
    @Query("DELETE FROM workouts")
    protected abstract suspend fun clearWorkouts()
    @Query("DELETE FROM gym_sessions")
    protected abstract suspend fun clearGym()

    @Insert protected abstract suspend fun insertMeals(records: List<MealRecord>)
    @Insert protected abstract suspend fun insertEntries(records: List<MealEntryRecord>)
    @Insert protected abstract suspend fun insertItems(records: List<MealItemRecord>)
    @Insert protected abstract suspend fun insertGoals(record: GoalsRecord)
    @Insert protected abstract suspend fun insertProfile(record: HealthProfileRecord)
    @Insert protected abstract suspend fun insertWeights(records: List<WeightRecord>)
    @Insert protected abstract suspend fun insertWorkouts(records: List<WorkoutRecord>)
    @Insert protected abstract suspend fun insertGym(records: List<GymSessionRecord>)
    @Insert protected abstract suspend fun insertSets(records: List<GymSetRecord>)
    @Upsert protected abstract suspend fun markDownloaded(record: DownloadRecord)
}
