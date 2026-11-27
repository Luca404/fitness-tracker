package it.trackrs.fittrackr.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import it.trackrs.fittrackr.R

@Composable
internal fun AppearanceScreen(selected: AppStyle, onSelect: (AppStyle) -> Unit) {
    PageBody(stringResource(R.string.appearance)) {
        Column(Modifier.selectableGroup(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            AppStyle.entries.forEach { style ->
                val checked = selected == style
                Surface(
                    color = if (checked) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.surfaceContainer,
                    shape = MaterialTheme.shapes.large,
                ) {
                    Row(
                        Modifier.fillMaxWidth().selectable(
                            selected = checked, role = Role.RadioButton, onClick = { onSelect(style) },
                        ).padding(horizontal = 12.dp, vertical = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(Modifier.size(40.dp).background(style.colors.surface, CircleShape), contentAlignment = Alignment.Center) {
                            Box(Modifier.size(16.dp).background(style.colors.primary, CircleShape))
                        }
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(stringResource(style.title), style = MaterialTheme.typography.titleMedium)
                            Text(stringResource(style.description), style = MaterialTheme.typography.bodyMedium)
                        }
                        RadioButton(selected = checked, onClick = null)
                    }
                }
            }
        }
    }
}
