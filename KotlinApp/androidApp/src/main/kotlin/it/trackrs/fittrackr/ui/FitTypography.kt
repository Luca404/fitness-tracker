package it.trackrs.fittrackr.ui

import androidx.compose.material3.Typography
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import it.trackrs.fittrackr.R

@OptIn(ExperimentalTextApi::class)
private val sourceSerif = FontFamily(
    listOf(FontWeight.Normal, FontWeight.Medium, FontWeight.SemiBold, FontWeight.Bold).flatMap { weight ->
        val variation = FontVariation.Settings(FontVariation.weight(weight.weight))
        listOf(
            Font(R.font.source_serif_4_roman, weight = weight, variationSettings = variation),
            Font(R.font.source_serif_4_italic, weight = weight, style = FontStyle.Italic, variationSettings = variation),
        )
    },
)

private fun TextStyle.inSourceSerif() = copy(fontFamily = sourceSerif)

internal val FitTypography = Typography().run {
    copy(
        displayLarge = displayLarge.inSourceSerif(),
        displayMedium = displayMedium.inSourceSerif(),
        displaySmall = displaySmall.inSourceSerif(),
        headlineLarge = headlineLarge.inSourceSerif(),
        headlineMedium = headlineMedium.inSourceSerif(),
        headlineSmall = headlineSmall.inSourceSerif(),
        titleLarge = titleLarge.inSourceSerif(),
        titleMedium = titleMedium.inSourceSerif(),
        titleSmall = titleSmall.inSourceSerif(),
        bodyLarge = bodyLarge.inSourceSerif(),
        bodyMedium = bodyMedium.inSourceSerif(),
        bodySmall = bodySmall.inSourceSerif(),
        labelLarge = labelLarge.inSourceSerif(),
        labelMedium = labelMedium.inSourceSerif(),
        labelSmall = labelSmall.inSourceSerif(),
    )
}
