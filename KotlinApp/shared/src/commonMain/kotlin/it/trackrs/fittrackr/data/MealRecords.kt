package it.trackrs.fittrackr.data

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
@Entity(tableName = "meals", indices = [Index("date")])
data class MealRecord(
    @PrimaryKey val id: String,
    val date: String,
    @SerialName("meal_type") val mealType: String,
    val name: String?,
    @SerialName("created_at") val createdAt: String?,
)

@Serializable
@Entity(
    tableName = "meal_entries",
    foreignKeys = [ForeignKey(
        entity = MealRecord::class, parentColumns = ["id"], childColumns = ["mealId"],
        onDelete = ForeignKey.CASCADE,
    )],
    indices = [Index("mealId")],
)
data class MealEntryRecord(
    @PrimaryKey val id: String,
    @SerialName("meal_id") val mealId: String,
    val name: String,
    @SerialName("dish_id") val dishId: String?,
    @SerialName("prepared_batch_id") val preparedBatchId: String?,
    @SerialName("cooked_portion_g") val cookedPortionG: Double?,
    @SerialName("created_at") val createdAt: String,
)

@Serializable
@Entity(
    tableName = "meal_items",
    foreignKeys = [ForeignKey(
        entity = MealEntryRecord::class, parentColumns = ["id"], childColumns = ["entryId"],
        onDelete = ForeignKey.CASCADE,
    )],
    indices = [Index("entryId")],
)
data class MealItemRecord(
    @PrimaryKey val id: String,
    @SerialName("entry_id") val entryId: String,
    @SerialName("food_name") val foodName: String,
    @SerialName("quantity_g") val quantity: Double,
    val unit: String,
    val position: Int? = null,
    val calories: Double,
    @SerialName("protein_g") val proteinG: Double,
    @SerialName("carbs_g") val carbsG: Double,
    @SerialName("fat_g") val fatG: Double,
    @SerialName("fiber_g") val fiberG: Double? = null,
    @SerialName("sugars_g") val sugarsG: Double? = null,
    @SerialName("salt_g") val saltG: Double? = null,
    @SerialName("piece_count") val pieceCount: Double? = null,
    @SerialName("piece_size") val pieceSize: String? = null,
    @SerialName("alcohol_abv") val alcoholAbv: Double? = null,
    @SerialName("dish_item_id") val dishItemId: String? = null,
    @SerialName("is_customization") val isCustomization: Boolean = false,
    @SerialName("pantry_item_id") val pantryItemId: String? = null,
    @SerialName("pantry_quantity_used") val pantryQuantityUsed: Double? = null,
    @SerialName("food_key") val foodKey: String? = null,
    @SerialName("off_food_id") val offFoodId: String? = null,
    val category: String,
    val source: String,
    @SerialName("created_at") val createdAt: String?,
)
