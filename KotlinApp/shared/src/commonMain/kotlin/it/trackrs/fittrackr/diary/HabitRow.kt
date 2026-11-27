package it.trackrs.fittrackr.diary

import kotlin.math.roundToInt

enum class FoodHabit(val weekly: Boolean = false, val maximum: Boolean = false) {
    Vegetables,
    Fruit,
    Legumes(weekly = true),
    Fish(weekly = true),
    Fiber,
    Sugars(maximum = true),
    Alcohol(maximum = true),
    Salt(maximum = true),
}

enum class HabitStatus { OnTrack, Attention, Incomplete }

data class HabitRow(
    val habit: FoodHabit,
    val value: Double?,
    val target: Double,
    val partial: Boolean = false,
) {
    val overLimit: Boolean get() = habit.maximum && value != null && value > target

    val status: HabitStatus
        get() {
            val amount = value ?: return HabitStatus.Incomplete
            val meetsTarget = if (habit.maximum) !overLimit else amount >= target
            if (partial && (if (habit.maximum) meetsTarget else !meetsTarget)) return HabitStatus.Incomplete
            return if (meetsTarget) HabitStatus.OnTrack else HabitStatus.Attention
        }

    val fill: Float
        get() {
            val amount = value ?: return 0f
            if (target <= 0) return if (overLimit) 1f else 0f
            val percent = (amount / target).coerceIn(0.0, 1.0) * 100
            return percent.roundToInt() / 100f
        }
}
