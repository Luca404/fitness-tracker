package it.trackrs.fittrackr.ui

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

private val diaryColors = darkColorScheme(
    primary = Color(0xFF6EE7B7),
    onPrimary = Color(0xFF052D24),
    secondaryContainer = Color(0xFF164539),
    onSecondaryContainer = Color(0xFFA7F3D0),
    background = Color(0xFF111827),
    surface = Color(0xFF111827),
    surfaceContainer = Color(0xFF182231),
    onSurface = Color(0xFFF1F5F9),
    onSurfaceVariant = Color(0xFFB9C5D3),
    outlineVariant = Color(0xFF344151),
    surfaceContainerHighest = Color(0xFF283546),
)

private val essentialColors = diaryColors.copy(
    primary = Color(0xFFCBDBF3), onPrimary = Color(0xFF152033),
    secondaryContainer = Color(0xFF28364A), onSecondaryContainer = Color(0xFFE0EBFE),
    background = Color(0xFF141619), surface = Color(0xFF141619),
    surfaceContainer = Color(0xFF1F2227), surfaceContainerHighest = Color(0xFF2C333C),
    onSurface = Color(0xFFF5F6F8), onSurfaceVariant = Color(0xFFC6CBD3), outlineVariant = Color(0xFF3E444D),
)

private val playfulColors = diaryColors.copy(
    primary = Color(0xFFF4C6EC), onPrimary = Color(0xFF44203E),
    secondaryContainer = Color(0xFF512D4D), onSecondaryContainer = Color(0xFFFFD9F6),
    background = Color(0xFF211827), surface = Color(0xFF211827),
    surfaceContainer = Color(0xFF302337), surfaceContainerHighest = Color(0xFF46344E),
    onSurface = Color(0xFFFFF3FC), onSurfaceVariant = Color(0xFFE1CBDE), outlineVariant = Color(0xFF634A66),
)

private val notebookColors = lightColorScheme(
    primary = Color(0xFF36604C), onPrimary = Color.White,
    secondaryContainer = Color(0xFFDCECDC), onSecondaryContainer = Color(0xFF244333),
    background = Color(0xFFFAF6EC), surface = Color(0xFFFAF6EC),
    surfaceContainer = Color(0xFFF1EADC), surfaceContainerHighest = Color(0xFFE7DECC),
    onSurface = Color(0xFF282920), onSurfaceVariant = Color(0xFF56574B), outlineVariant = Color(0xFFCEC5B4),
)

internal val AppStyle.colors: ColorScheme
    get() = when (this) {
        AppStyle.Diary -> diaryColors
        AppStyle.Essential -> essentialColors
        AppStyle.Playful -> playfulColors
        AppStyle.Notebook -> notebookColors
    }

internal val LocalAppStyle = staticCompositionLocalOf { AppStyle.Diary }

@Composable
internal fun FitTheme(style: AppStyle, content: @Composable () -> Unit) {
    val radius = when (style) {
        AppStyle.Diary -> 20.dp
        AppStyle.Essential -> 8.dp
        AppStyle.Playful -> 28.dp
        AppStyle.Notebook -> 12.dp
    }
    CompositionLocalProvider(LocalAppStyle provides style) {
        MaterialTheme(
            colorScheme = style.colors,
            typography = FitTypography,
            shapes = Shapes(medium = RoundedCornerShape(radius / 2), large = RoundedCornerShape(radius)),
            content = content,
        )
    }
}
