package it.trackrs.fittrackr.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import it.trackrs.fittrackr.R
import it.trackrs.fittrackr.auth.AccountAccess
import it.trackrs.fittrackr.auth.AccountSession
import it.trackrs.fittrackr.data.DiarySync
import it.trackrs.fittrackr.features.*
import it.trackrs.fittrackr.features.meals.DiaryDownloadScreen
import it.trackrs.fittrackr.features.meals.MealsScreen
import it.trackrs.fittrackr.features.meals.habits.HabitDetails
import it.trackrs.fittrackr.ui.AppearanceScreen
import it.trackrs.fittrackr.ui.AppearanceSettings
import it.trackrs.fittrackr.ui.DirectoryPage
import it.trackrs.fittrackr.ui.LanguageScreen
import it.trackrs.fittrackr.ui.LocalAppStyle
import it.trackrs.fittrackr.ui.PageBody
import it.trackrs.fittrackr.ui.PageLink
import java.time.LocalDate

private val links = fitnessLinks + kitchenLinks + diaryLinks + accountLinks

@Composable
internal fun AppNavigation(
    account: AccountAccess.SignedIn,
    session: AccountSession,
    sync: DiarySync,
    appearance: AppearanceSettings,
    today: LocalDate,
) {
    val activeDiary by sync.active.collectAsState()
    val diary = activeDiary?.takeIf { it.userId == account.userId }
    val nav = rememberNavController()
    val entry by nav.currentBackStackEntryAsState()
    val current = entry?.destination?.route?.substringBefore('/')?.let(Page::valueOf) ?: Page.Meals
    val atRoot = current in tabs
    val open: (Page) -> Unit = { page ->
        nav.navigate(page.name) { launchSingleTop = true }
    }

    Scaffold(
        topBar = {
            AppHeader(
                atRoot, open, back = { nav.popBackStack() },
                backLabel = if (current == Page.Habits) R.string.meals else R.string.back,
            )
        },
        bottomBar = {
            if (atRoot) SectionBar(current) { section ->
                nav.navigate(section.name) {
                    popUpTo(Page.Meals.name) { saveState = true }
                    launchSingleTop = true
                    restoreState = true
                }
            }
        },
    ) { padding ->
        NavHost(nav, startDestination = Page.Meals.name, modifier = Modifier.padding(padding)) {
            Page.entries.forEach { page ->
                val route = if (page == Page.Habits) "${page.name}/{date}" else page.name
                composable(route) { destination ->
                    when (page) {
                        Page.Account -> AccountScreen(account, session)
                        Page.Language -> LanguageScreen()
                        Page.Meals -> MealsScreen(diary, today, sync::refresh) { date ->
                            nav.navigate("${Page.Habits.name}/$date") { launchSingleTop = true }
                        }
                        Page.Habits -> {
                            val date = destination.arguments?.getString("date")?.let(LocalDate::parse) ?: today
                            HabitDetails(diary, date, sync::refresh)
                        }
                        Page.Settings -> SettingsPage(open)
                        Page.Appearance -> AppearanceScreen(LocalAppStyle.current, appearance::select)
                        Page.Sync -> DiaryDownloadScreen(diary, sync::refresh)
                        else -> DirectoryPage(page, links[page].orEmpty(), open)
                    }
                }
            }
        }
    }
}

@Composable
private fun SettingsPage(open: (Page) -> Unit) {
    PageBody(stringResource(Page.Settings.title)) {
        accountLinks.getValue(Page.Settings).forEach { page ->
            val detail = if (page == Page.Appearance) stringResource(LocalAppStyle.current.title) else null
            PageLink(stringResource(page.title), detail) { open(page) }
        }
    }
}
