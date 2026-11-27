package it.trackrs.fittrackr.data

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
@Entity(tableName = "user_goals")
data class GoalsRecord(
    @PrimaryKey @SerialName("user_id") val userId: String,
    @SerialName("calorie_target") val calorieTarget: Int,
    @SerialName("protein_g") val proteinG: Double,
    @SerialName("carbs_g") val carbsG: Double,
    @SerialName("fat_g") val fatG: Double,
    @SerialName("calculation_weight_kg") val calculationWeightKg: Double? = null,
    @SerialName("updated_at") val updatedAt: String?,
)

@Serializable
@Entity(tableName = "user_health_profiles")
data class HealthProfileRecord(
    @PrimaryKey @SerialName("user_id") val userId: String,
    val age: Int,
    val sex: String,
    @SerialName("height_cm") val heightCm: Double,
    @SerialName("weight_kg") val weightKg: Double,
    @SerialName("activity_level") val activityLevel: String,
    val objective: String,
    @SerialName("target_weight_kg") val targetWeightKg: Double?,
    @SerialName("target_date") val targetDate: String?,
    @SerialName("body_fat_pct") val bodyFatPct: Double?,
    @SerialName("bmr_override") val bmrOverride: Double?,
    @SerialName("does_resistance_training") val doesResistanceTraining: Boolean = false,
    @SerialName("tutorial_seen") val tutorialSeen: Boolean = false,
    @SerialName("created_at") val createdAt: String?,
    @SerialName("updated_at") val updatedAt: String?,
)

@Serializable
@Entity(tableName = "weight_logs", indices = [Index(value = ["date"], unique = true)])
data class WeightRecord(
    @PrimaryKey val id: String,
    val date: String,
    @SerialName("weight_kg") val weightKg: Double,
    val notes: String?,
    @SerialName("created_at") val createdAt: String?,
)

@Serializable
@Entity(tableName = "workouts", indices = [Index("date")])
data class WorkoutRecord(
    @PrimaryKey val id: String,
    val date: String,
    val activity: String,
    @SerialName("duration_min") val durationMin: Int,
    @SerialName("distance_km") val distanceKm: Double? = null,
    @SerialName("incline_pct") val inclinePct: Double? = null,
    @SerialName("stroke_rate_spm") val strokeRateSpm: Double? = null,
    @SerialName("calories_burned") val caloriesBurned: Double,
    val notes: String?,
    @SerialName("created_at") val createdAt: String?,
)
