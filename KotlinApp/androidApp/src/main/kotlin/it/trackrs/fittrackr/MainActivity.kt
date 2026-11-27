package it.trackrs.fittrackr

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.core.view.WindowCompat
import it.trackrs.fittrackr.auth.AccountAccess
import it.trackrs.fittrackr.features.AccessScreen
import it.trackrs.fittrackr.navigation.AppNavigation
import it.trackrs.fittrackr.ui.FitTheme
import java.time.LocalDate

class MainActivity : AppCompatActivity() {
    private val app get() = application as FitTrackrApplication
    private val session get() = app.accountSession
    private val today = mutableStateOf(LocalDate.now())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val style by app.appearance.style.collectAsState()
            SideEffect {
                val bars = WindowCompat.getInsetsController(window, window.decorView)
                bars.isAppearanceLightStatusBars = style.light
                bars.isAppearanceLightNavigationBars = style.light
            }
            FitTheme(style) {
                val access by session.state.collectAsState()
                when (val current = access) {
                    AccountAccess.Loading -> Surface(Modifier.fillMaxSize()) {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator()
                        }
                    }
                    is AccountAccess.SignedOut -> AccessScreen(session, current.notice)
                    is AccountAccess.SignedIn -> key(current.userId) {
                        AppNavigation(current, session, app.diarySync, app.appearance, today.value)
                    }
                }
            }
        }
    }

    override fun onStart() {
        super.onStart()
        today.value = LocalDate.now()
        session.onForeground()
        app.diarySync.refresh()
    }

    override fun onStop() {
        session.markUsed()
        super.onStop()
    }
}
