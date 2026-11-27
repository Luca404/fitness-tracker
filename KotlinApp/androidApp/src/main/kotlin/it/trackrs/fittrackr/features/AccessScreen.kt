package it.trackrs.fittrackr.features

import androidx.activity.compose.BackHandler
import androidx.annotation.StringRes
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import it.trackrs.fittrackr.R
import it.trackrs.fittrackr.auth.AccountSession

internal enum class AccessMode(@param:StringRes val label: Int) {
    Login(R.string.login),
    Register(R.string.register),
    Recovery(R.string.recovery),
}

@Composable
internal fun AccessScreen(session: AccountSession, @StringRes notice: Int?) {
    var mode by rememberSaveable { mutableStateOf(AccessMode.Login) }
    var email by rememberSaveable { mutableStateOf("") }
    val submission = remember { mutableStateOf(false) }
    val busy by submission

    BackHandler(mode != AccessMode.Login && !busy) { mode = AccessMode.Login }
    Surface(Modifier.fillMaxSize()) {
        Box(
            Modifier.fillMaxSize().safeDrawingPadding().imePadding(),
            contentAlignment = Alignment.TopCenter,
        ) {
            Column(
                Modifier.widthIn(max = 480.dp).fillMaxWidth().verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp, vertical = 24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                AccessHeader(mode)
                Surface(
                    shape = RoundedCornerShape(24.dp),
                    color = MaterialTheme.colorScheme.surfaceContainer,
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                ) {
                    Column(
                        Modifier.fillMaxWidth().padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        if (mode != AccessMode.Recovery) {
                            AccessModeSelector(mode, enabled = !busy, onSelect = { mode = it })
                        }
                        key(mode) {
                            AccessForm(
                                session, mode, email, { email = it }, submission,
                                notice = notice.takeIf { mode == AccessMode.Login },
                                onRecover = { mode = AccessMode.Recovery },
                            )
                        }
                        if (mode == AccessMode.Recovery) {
                            TextButton(onClick = { mode = AccessMode.Login }, enabled = !busy) {
                                Text(stringResource(R.string.auth_back_to_login))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AccessModeSelector(mode: AccessMode, enabled: Boolean, onSelect: (AccessMode) -> Unit) {
    val colors = MaterialTheme.colorScheme
    val options = listOf(AccessMode.Login to R.string.login, AccessMode.Register to R.string.auth_register_tab)
    SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
        options.forEachIndexed { index, (option, label) ->
            SegmentedButton(
                selected = mode == option,
                enabled = enabled,
                onClick = { onSelect(option) },
                shape = SegmentedButtonDefaults.itemShape(index, count = options.size),
                colors = SegmentedButtonDefaults.colors(
                    activeContainerColor = colors.secondaryContainer,
                    activeContentColor = colors.onSecondaryContainer,
                    activeBorderColor = colors.outlineVariant,
                    inactiveContainerColor = colors.surface,
                    inactiveContentColor = colors.onSurfaceVariant,
                    inactiveBorderColor = colors.outlineVariant,
                ),
                label = { Text(stringResource(label)) },
            )
        }
    }
}
