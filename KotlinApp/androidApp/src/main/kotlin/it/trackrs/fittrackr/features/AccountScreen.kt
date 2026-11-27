package it.trackrs.fittrackr.features

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import it.trackrs.fittrackr.R
import it.trackrs.fittrackr.auth.AccountAccess
import it.trackrs.fittrackr.auth.AccountSession
import it.trackrs.fittrackr.ui.PageBody
import kotlinx.coroutines.launch

@Composable
internal fun AccountScreen(account: AccountAccess.SignedIn, session: AccountSession) {
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    PageBody(stringResource(R.string.account)) {
        account.email?.let { Text(it) }
        OutlinedButton(
            enabled = !busy,
            modifier = Modifier.padding(top = 16.dp),
            onClick = {
                busy = true
                scope.launch {
                    try {
                        session.signOut()
                    } finally {
                        busy = false
                    }
                }
            },
        ) {
            Text(stringResource(if (busy) R.string.auth_wait else R.string.auth_sign_out))
        }
    }
}
