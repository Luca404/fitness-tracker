package it.trackrs.fittrackr.features.meals

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import it.trackrs.fittrackr.R
import it.trackrs.fittrackr.data.DiaryDay
import it.trackrs.fittrackr.data.GoalsRecord
import it.trackrs.fittrackr.diary.Nutrition
import it.trackrs.fittrackr.diary.caloriesBurned
import it.trackrs.fittrackr.diary.nutrition
import it.trackrs.fittrackr.ui.LocalAppStyle
import it.trackrs.fittrackr.ui.appContentLocale
import java.text.NumberFormat
import kotlin.math.abs
import kotlin.math.roundToInt

@Composable
internal fun NutritionOverview(day: DiaryDay) {
    val nutrition = remember(day) {
        day.meals.flatMap { it.entries }.flatMap { it.items }.nutrition()
    }
    val burned = remember(day) { day.caloriesBurned().roundToInt() }
    val goals = day.goals
    val energy = goals?.calorieTarget?.takeIf { it > 0 }
    Surface(shape = MaterialTheme.shapes.large, color = MaterialTheme.colorScheme.surfaceContainer) {
        Column(
            Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            EnergySummary(nutrition.calories, energy, burned)
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            MacroCharts(nutrition, goals)
        }
    }
}

@Composable
private fun EnergySummary(calories: Double, target: Int?, burned: Int) {
    val remaining = target?.let { it - calories.roundToInt() }
    val overTarget = remaining != null && remaining < 0
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        EnergyChart(calories, target, overTarget, Modifier.weight(1f))
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            EnergyMetric(
                stringResource(if (overTarget) R.string.meals_energy_over else R.string.meals_energy_left),
                remaining?.let { abs(it) },
                highlighted = overTarget,
            )
            EnergyMetric(stringResource(R.string.meals_burned), burned)
        }
    }
}

@Composable
private fun EnergyChart(calories: Double, target: Int?, overTarget: Boolean, modifier: Modifier) {
    val color = if (overTarget) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary
    val valuesInside = LocalDensity.current.fontScale <= 1.3f
    Column(
        modifier.semantics(mergeDescendants = true) {},
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        NutritionRing(
            calories, target?.toDouble(), color, 14.dp,
            Modifier.widthIn(max = 144.dp).fillMaxWidth().aspectRatio(1f),
        ) {
            if (valuesInside) EnergyValues(calories, target)
        }
        if (!valuesInside) EnergyValues(calories, target)
    }
}

@Composable
private fun EnergyValues(calories: Double, target: Int?) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            mealNumber(calories.roundToInt().toDouble()),
            style = MaterialTheme.typography.headlineMedium.copy(fontSize = 30.sp, fontFeatureSettings = "tnum"),
            textAlign = TextAlign.Center,
        )
        ChartTarget(
            if (target == null) stringResource(R.string.meals_kcal_unit)
            else stringResource(R.string.meals_kcal_target, mealNumber(target.toDouble())),
        )
    }
}

@Composable
private fun ChartTarget(text: String) {
    Text(
        text, style = MaterialTheme.typography.bodyMedium.copy(fontSize = 16.sp, fontFeatureSettings = "tnum"),
        color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center,
    )
}

@Composable
private fun EnergyMetric(label: String, calories: Int?, highlighted: Boolean = false) {
    val colors = MaterialTheme.colorScheme
    Column(
        Modifier.fillMaxWidth().semantics(mergeDescendants = true) {},
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            label, color = colors.onSurfaceVariant, style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center,
        )
        Text(
            calories?.let { stringResource(R.string.meals_kcal, mealNumber(it.toDouble())) }
                ?: stringResource(R.string.meals_goal_unset),
            style = MaterialTheme.typography.titleMedium.copy(
                fontSize = 22.sp, lineHeight = 28.sp, fontFeatureSettings = "tnum",
            ),
            color = if (highlighted) colors.error else colors.onSurface,
            textAlign = TextAlign.Center,
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun MacroCharts(nutrition: Nutrition, goals: GoalsRecord?) {
    val light = LocalAppStyle.current.light
    val density = LocalDensity.current
    val fontScale = density.fontScale.coerceAtLeast(1f)
    val gap = 12.dp
    BoxWithConstraints(Modifier.fillMaxWidth()) {
        val diameter = with(density) {
            val availablePx = (constraints.maxWidth - gap.roundToPx() * 2).coerceAtLeast(0)
            minOf((availablePx / 3).toDp(), 108.dp)
        }
        val ringSize = if (diameter >= 80.dp * fontScale) diameter else minOf(maxWidth, 104.dp * fontScale)
        FlowRow(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(gap, Alignment.CenterHorizontally),
            verticalArrangement = Arrangement.spacedBy(gap),
            maxItemsInEachRow = 3,
        ) {
            MacroChart(
                stringResource(R.string.meals_protein), nutrition.proteinG, goals?.proteinG,
                if (light) Color(0xFF205E9C) else Color(0xFF68BBF7), ringSize,
            )
            MacroChart(
                stringResource(R.string.meals_carbs), nutrition.carbsG, goals?.carbsG,
                if (light) Color(0xFF6334AA) else Color(0xFFC3A0FF), ringSize,
            )
            MacroChart(
                stringResource(R.string.meals_fat), nutrition.fatG, goals?.fatG,
                if (light) Color(0xFF8A5315) else Color(0xFFF5BF68), ringSize,
            )
        }
    }
}

@Composable
private fun MacroChart(label: String, grams: Double, target: Double?, color: Color, diameter: Dp) {
    val goal = target?.takeIf { it > 0 }
    Column(
        Modifier.width(diameter).semantics(mergeDescendants = true) {},
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Text(
            label,
            modifier = Modifier.wrapContentWidth(unbounded = true).widthIn(max = diameter + 8.dp),
            style = MaterialTheme.typography.labelLarge.copy(fontSize = 16.sp),
            color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center,
        )
        NutritionRing(grams, goal, color, 10.dp, Modifier.fillMaxWidth().aspectRatio(1f)) {
            Column(Modifier.fillMaxWidth(0.78f), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    mealNumber(grams),
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontSize = 22.sp, lineHeight = 26.sp, fontFeatureSettings = "tnum",
                    ),
                    textAlign = TextAlign.Center,
                )
                ChartTarget(
                    if (goal == null) stringResource(R.string.meals_grams_unit)
                    else stringResource(R.string.meals_grams_target, mealNumber(goal)),
                )
            }
        }
    }
}

@Composable
internal fun mealNumber(value: Double, decimals: Int = 0): String {
    val locale = appContentLocale()
    val formatter = remember(locale, decimals) {
        NumberFormat.getNumberInstance(locale).apply { maximumFractionDigits = decimals }
    }
    return formatter.format(value)
}
