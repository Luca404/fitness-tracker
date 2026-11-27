package it.trackrs.fittrackr.features.meals

import androidx.annotation.StringRes
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.dp
import it.trackrs.fittrackr.R
import it.trackrs.fittrackr.data.MealItemRecord
import it.trackrs.fittrackr.data.RecordedMealEntry
import it.trackrs.fittrackr.diary.MealGroup
import it.trackrs.fittrackr.diary.MealMoment
import it.trackrs.fittrackr.ui.AppStyle
import it.trackrs.fittrackr.ui.LocalAppStyle

@Composable
internal fun MealGroupHeading(group: MealGroup, style: AppStyle) {
    val name = stringResource(group.moment.label)
    val calories = group.entries.sumOf { entry -> entry.items.sumOf { it.calories } }
    Row(
        Modifier.fillMaxWidth().padding(top = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        if (style == AppStyle.Playful) Text(group.moment.emoji, Modifier.clearAndSetSemantics {})
        Text(name, Modifier.weight(1f).semantics { heading() }, style = MaterialTheme.typography.titleMedium)
        Text(
            stringResource(R.string.meals_kcal, mealNumber(calories)),
            color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.labelLarge,
        )
    }
}

@Composable
internal fun MealEntryRow(record: RecordedMealEntry, expanded: Boolean, toggle: () -> Unit) {
    val state = stringResource(if (expanded) R.string.meals_detail_expanded else R.string.meals_detail_collapsed)
    val compact = LocalAppStyle.current == AppStyle.Essential
    val items = remember(record) {
        record.items.sortedWith(compareBy<MealItemRecord> { it.position ?: Int.MAX_VALUE }
            .thenBy { it.createdAt }.thenBy { it.id })
    }
    val calories = remember(record) { record.items.sumOf { it.calories } }
    Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surfaceContainer) {
        Column {
            Row(
                Modifier.fillMaxWidth().heightIn(min = 52.dp).semantics { stateDescription = state }
                    .clickable(role = Role.Button, onClick = toggle)
                    .padding(horizontal = 12.dp, vertical = if (compact) 8.dp else 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(record.entry.name, style = MaterialTheme.typography.bodyLarge)
                    if (!compact) Text(
                        pluralStringResource(R.plurals.meals_ingredient_count, items.size, items.size),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
                Text(stringResource(R.string.meals_kcal, mealNumber(calories)), style = MaterialTheme.typography.labelLarge)
                Icon(
                    painterResource(R.drawable.ic_chevron), contentDescription = null,
                    Modifier.size(18.dp).graphicsLayer { rotationZ = if (expanded) -90f else 90f },
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (expanded) {
                Column(Modifier.padding(horizontal = 12.dp)) {
                    record.entry.cookedPortionG?.let { grams ->
                        Text(
                            stringResource(R.string.meals_cooked_portion, mealNumber(grams, 1)),
                            Modifier.padding(bottom = 8.dp), style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                    items.forEach { MealIngredient(it) }
                }
            }
        }
    }
}

@Composable
private fun MealIngredient(item: MealItemRecord) {
    HorizontalDivider()
    Row(
        Modifier.fillMaxWidth().padding(vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Column(Modifier.weight(1f)) {
            Text(item.foodName, style = MaterialTheme.typography.bodyMedium)
            if (item.isCustomization) Text(
                stringResource(R.string.meals_customization),
                color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall,
            )
        }
        val pieces = item.pieceCount
        val quantity = when {
            pieces != null -> stringResource(R.string.meals_pieces, mealNumber(pieces, 1))
            item.unit == "ml" -> stringResource(R.string.meals_ml, mealNumber(item.quantity, 1))
            else -> stringResource(R.string.meals_grams, mealNumber(item.quantity, 1))
        }
        Text(quantity, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@get:StringRes
private val MealMoment.label get() = when (this) {
    MealMoment.Breakfast -> R.string.breakfast
    MealMoment.Lunch -> R.string.lunch
    MealMoment.Dinner -> R.string.dinner
    MealMoment.Snack -> R.string.snack
    MealMoment.Drinks -> R.string.drinks
}

private val MealMoment.emoji get() = when (this) {
    MealMoment.Breakfast -> "☀️"
    MealMoment.Lunch -> "🍽️"
    MealMoment.Dinner -> "🌙"
    MealMoment.Snack -> "🍎"
    MealMoment.Drinks -> "🥤"
}
