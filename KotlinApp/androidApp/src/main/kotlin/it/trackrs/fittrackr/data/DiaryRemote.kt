package it.trackrs.fittrackr.data

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

internal class DiaryRemote(private val client: SupabaseClient, private val userId: String) {
    suspend fun download(): DiaryDownload = coroutineScope {
        checkAccount()
        val meals = async { allRows("meals", MealRecord::id, owned = true) }
        val entries = async { allRows("meal_entries", MealEntryRecord::id) }
        val items = async { allRows("meal_items", MealItemRecord::id) }
        val goals = async { ownRecord<GoalsRecord>("user_goals") }
        val profile = async { ownRecord<HealthProfileRecord>("user_health_profiles") }
        val weights = async { allRows("weight_logs", WeightRecord::id, owned = true) }
        val workouts = async { allRows("workouts", WorkoutRecord::id, owned = true) }
        val gym = async { allRows("gym_sessions", GymSessionRecord::id, owned = true) }
        val sets = async { allRows("gym_sets", GymSetRecord::id) }
        DiaryDownload(
            meals.await(), entries.await(), items.await(), goals.await(), profile.await(),
            weights.await(), workouts.await(), gym.await(), sets.await(),
        ).also { checkAccount() }
    }

    private fun checkAccount() {
        check(client.auth.currentSessionOrNull()?.user?.id == userId)
    }

    private suspend inline fun <reified Row : Any> ownRecord(table: String): Row? =
        client.from(table).select { filter { eq("user_id", userId) } }.decodeList<Row>().singleOrNull()

    private suspend inline fun <reified Row : Any> allRows(
        table: String,
        id: (Row) -> String,
        owned: Boolean = false,
    ): List<Row> = buildList {
        var cursor: String? = null
        while (true) {
            checkAccount()
            val page = client.from(table).select {
                filter {
                    if (owned) eq("user_id", userId)
                    cursor?.let { gt("id", it) }
                }
                order("id", Order.ASCENDING)
                limit(500)
            }.decodeList<Row>()
            if (page.isEmpty()) break
            addAll(page)
            val next = id(page.last())
            check(cursor != next)
            cursor = next
        }
    }
}
