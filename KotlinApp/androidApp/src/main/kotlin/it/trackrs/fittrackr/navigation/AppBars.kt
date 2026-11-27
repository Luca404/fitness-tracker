package it.trackrs.fittrackr.navigation

import androidx.annotation.StringRes
import androidx.compose.foundation.layout.size
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import it.trackrs.fittrackr.R

internal val tabs = mapOf(
    Page.Fitness to R.drawable.ic_fitness,
    Page.Kitchen to R.drawable.ic_kitchen,
    Page.Meals to R.drawable.ic_meals,
    Page.Weight to R.drawable.ic_weight,
    Page.History to R.drawable.ic_history,
)

@Composable
internal fun SectionBar(selected: Page, select: (Page) -> Unit) {
    NavigationBar {
        tabs.forEach { (page, icon) ->
            NavigationBarItem(
                selected = selected == page,
                onClick = { select(page) },
                icon = { Icon(painterResource(icon), null, Modifier.size(23.dp)) },
                label = { Text(stringResource(page.title)) },
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun AppHeader(atRoot: Boolean, open: (Page) -> Unit, back: () -> Unit, @StringRes backLabel: Int) {
    TopAppBar(
        title = {
            Text(stringResource(R.string.app_name), color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.titleLarge)
        },
        navigationIcon = {
            if (!atRoot) TextButton(onClick = back) { Text(stringResource(backLabel)) }
        },
        actions = {
            if (atRoot) {
                TextButton(onClick = { open(Page.Points) }) { Text(stringResource(R.string.points_short)) }
                IconButton(onClick = { open(Page.Settings) }) {
                    Icon(painterResource(R.drawable.ic_settings), stringResource(R.string.settings))
                }
            }
        },
    )
}
