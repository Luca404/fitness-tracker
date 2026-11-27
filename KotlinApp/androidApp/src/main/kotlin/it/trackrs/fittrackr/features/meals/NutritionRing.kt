package it.trackrs.fittrackr.features.meals

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp

@Composable
internal fun NutritionRing(
    value: Double,
    target: Double?,
    color: Color,
    thickness: Dp,
    modifier: Modifier,
    content: @Composable () -> Unit = {},
) {
    val track = MaterialTheme.colorScheme.outlineVariant
    val progress = if (target != null && target > 0) (value / target).coerceIn(0.0, 1.0) else 0.0
    Box(modifier, contentAlignment = Alignment.Center) {
        Canvas(Modifier.matchParentSize()) {
            val stroke = Stroke(thickness.toPx(), cap = StrokeCap.Round)
            val diameter = size.minDimension - stroke.width
            if (diameter <= 0f) return@Canvas
            drawCircle(if (progress == 1.0) color else track, radius = diameter / 2, style = stroke)
            if (progress > 0.0 && progress < 1.0) {
                drawArc(
                    color = color, startAngle = -90f, sweepAngle = (progress * 360).toFloat(),
                    useCenter = false, topLeft = center - Offset(diameter / 2, diameter / 2),
                    size = Size(diameter, diameter), style = stroke,
                )
            }
        }
        content()
    }
}
