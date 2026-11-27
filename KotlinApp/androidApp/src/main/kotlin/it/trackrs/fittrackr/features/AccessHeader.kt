package it.trackrs.fittrackr.features

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import it.trackrs.fittrackr.R

@Composable
internal fun AccessHeader(mode: AccessMode) {
    val colors = MaterialTheme.colorScheme
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Image(
                painterResource(R.drawable.app_icon),
                contentDescription = null,
                modifier = Modifier.size(36.dp).clip(RoundedCornerShape(9.dp)),
            )
            Text(
                stringResource(R.string.app_name),
                style = MaterialTheme.typography.titleLarge,
            )
        }
        if (mode != AccessMode.Recovery) {
            val register = mode == AccessMode.Register
            val firstLine = stringResource(if (register) R.string.auth_register_intro else R.string.auth_login_intro)
            val secondLine = stringResource(if (register) R.string.auth_register_accent else R.string.auth_login_accent)
            Surface(
                shape = RoundedCornerShape(20.dp),
                border = BorderStroke(1.dp, colors.outlineVariant),
            ) {
                Text(
                    buildAnnotatedString {
                        appendLine(firstLine)
                        withStyle(SpanStyle(color = colors.primary)) { append(secondLine) }
                    },
                    style = MaterialTheme.typography.headlineLarge,
                    color = colors.onSurface,
                    modifier = Modifier.fillMaxWidth()
                        .coverTracks(colors.surface, colors.secondaryContainer, colors.primary)
                        .heightIn(min = 120.dp)
                        .padding(20.dp)
                        .semantics { heading() },
                )
            }
        }
    }
}

private fun Modifier.coverTracks(background: Color, highlight: Color, ink: Color): Modifier = drawWithCache {
    val backdrop = Brush.linearGradient(
        listOf(background, highlight),
        start = Offset(0f, size.height),
        end = Offset(size.width, 0f),
    )
    val line = Brush.horizontalGradient(
        listOf(Color.Transparent, ink.copy(alpha = 0.38f)),
        startX = size.width * 0.45f,
        endX = size.width,
    )
    val stroke = Stroke(width = 1.dp.toPx())
    val spacing = 13.dp.toPx()
    val tracks = List(5) { index ->
        val y = size.height * 0.52f + index * spacing
        Path().apply {
            moveTo(size.width * 0.42f, y + size.height * 0.42f)
            cubicTo(
                size.width * 0.76f, y + size.height * 0.46f,
                size.width * 0.79f, y - size.height * 0.54f,
                size.width + spacing, y - size.height * 0.46f,
            )
        }
    }
    onDrawBehind {
        drawRect(backdrop)
        tracks.forEach { drawPath(it, line, style = stroke) }
    }
}
