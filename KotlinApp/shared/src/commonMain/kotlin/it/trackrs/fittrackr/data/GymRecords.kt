package it.trackrs.fittrackr.data

import androidx.room.Embedded
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import androidx.room.Relation
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
@Entity(tableName = "gym_sessions", indices = [Index("date")])
data class GymSessionRecord(
    @PrimaryKey val id: String,
    val date: String,
    @SerialName("plan_id") val planId: String?,
    @SerialName("plan_name") val planName: String,
    @SerialName("started_at") val startedAt: String,
    @SerialName("completed_at") val completedAt: String?,
)

@Serializable
@Entity(
    tableName = "gym_sets",
    foreignKeys = [ForeignKey(
        entity = GymSessionRecord::class, parentColumns = ["id"], childColumns = ["sessionId"],
        onDelete = ForeignKey.CASCADE,
    )],
    indices = [Index("sessionId")],
)
data class GymSetRecord(
    @PrimaryKey val id: String,
    @SerialName("session_id") val sessionId: String,
    @SerialName("exercise_key") val exerciseKey: String?,
    @SerialName("exercise_name") val exerciseName: String,
    val equipment: String,
    @SerialName("per_side") val perSide: Boolean = false,
    @SerialName("weight_kg") val weightKg: Double?,
    @SerialName("exercise_position") val exercisePosition: Int,
    @SerialName("set_number") val setNumber: Int,
    @SerialName("target_reps") val targetReps: Int?,
    @SerialName("target_reps_max") val targetRepsMax: Int? = null,
    @SerialName("bench_angle") val benchAngle: Int? = null,
    val reps: Int?,
    val done: Boolean,
)

data class RecordedGymSession(
    @Embedded val session: GymSessionRecord,
    @Relation(parentColumn = "id", entityColumn = "sessionId") val sets: List<GymSetRecord>,
)
