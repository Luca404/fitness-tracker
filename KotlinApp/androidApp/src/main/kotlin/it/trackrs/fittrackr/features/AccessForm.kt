package it.trackrs.fittrackr.features

import android.util.Patterns
import androidx.annotation.StringRes
import androidx.activity.compose.LocalActivity
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import io.github.jan.supabase.exceptions.RestException
import it.trackrs.fittrackr.R
import it.trackrs.fittrackr.auth.AccountSession
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch

@Composable
internal fun AccessForm(
    session: AccountSession,
    mode: AccessMode,
    email: String,
    onEmailChange: (String) -> Unit,
    submission: MutableState<Boolean>,
    @StringRes notice: Int?,
    onRecover: () -> Unit,
) {
    var password by remember { mutableStateOf("") }
    var confirmation by remember { mutableStateOf("") }
    var emailError by remember { mutableStateOf(false) }
    var passwordError by remember { mutableStateOf<Int?>(null) }
    var confirmationError by remember { mutableStateOf(false) }
    var feedback by remember { mutableStateOf<AuthFeedback?>(null) }
    val busy by submission
    val activity = LocalActivity.current
    val scope = rememberCoroutineScope()
    val focus = LocalFocusManager.current
    val register = mode == AccessMode.Register
    val recovery = mode == AccessMode.Recovery
    val canSubmit = !busy && session.configured

    fun send(usingGoogle: Boolean = false, request: suspend () -> AuthFeedback?) {
        if (busy) return
        focus.clearFocus()
        feedback = null
        submission.value = true
        scope.launch {
            try {
                feedback = request()
                password = ""
                confirmation = ""
            } catch (error: CancellationException) {
                throw error
            } catch (_: GetCredentialCancellationException) {
                // Returning from the account picker leaves the email form available.
            } catch (error: Exception) {
                val code = (error as? RestException)?.error
                feedback = when {
                    error is NoCredentialException ->
                        AuthFeedback(R.string.auth_google_no_account, error = true)
                    error is GetCredentialException || code == "provider_disabled" ->
                        AuthFeedback(R.string.auth_google_unavailable, error = true)
                    !usingGoogle && register && code in setOf("user_already_exists", "email_exists") ->
                        AuthFeedback(R.string.auth_check_email)
                    else -> AuthFeedback(authErrorMessage(error), error = true)
                }
            } finally {
                submission.value = false
            }
        }
    }

    fun submit() {
        if (busy || !session.configured) return
        val address = email.trim()
        emailError = !Patterns.EMAIL_ADDRESS.matcher(address).matches()
        passwordError = when {
            recovery -> null
            password.isEmpty() -> R.string.auth_password_required
            register && password.length < 8 -> R.string.auth_password_length
            else -> null
        }
        confirmationError = register && password != confirmation
        feedback = null
        if (emailError || passwordError != null || confirmationError) return

        send {
            when (mode) {
                AccessMode.Login -> {
                    session.signIn(address, password)
                    null
                }
                AccessMode.Register -> {
                    session.register(address, password)
                    AuthFeedback(R.string.auth_check_email)
                }
                AccessMode.Recovery -> {
                    session.recover(address)
                    AuthFeedback(R.string.auth_recovery_sent)
                }
            }
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (recovery) {
            Text(stringResource(mode.label), style = MaterialTheme.typography.headlineMedium)
            Text(stringResource(R.string.auth_recovery_description), color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        OutlinedTextField(
            value = email,
            onValueChange = {
                onEmailChange(it)
                emailError = false
            },
            label = { Text(stringResource(R.string.email)) },
            enabled = !busy,
            isError = emailError,
            supportingText = if (emailError) {
                { Text(stringResource(R.string.auth_email_invalid)) }
            } else null,
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = if (recovery) ImeAction.Done else ImeAction.Next),
            keyboardActions = KeyboardActions(onDone = { submit() }),
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
        )
        if (!recovery) {
            AccessPassword(
                R.string.password, password,
                onChange = {
                    password = it
                    passwordError = null
                },
                enabled = !busy, error = passwordError,
                hint = R.string.auth_password_length.takeIf { register }, next = register,
                onDone = ::submit,
            )
        }
        if (register) {
            AccessPassword(
                R.string.confirm_password, confirmation,
                onChange = {
                    confirmation = it
                    confirmationError = false
                },
                enabled = !busy, error = R.string.auth_password_mismatch.takeIf { confirmationError },
                onDone = ::submit,
            )
        }
        if (mode == AccessMode.Login) {
            TextButton(
                onClick = onRecover,
                enabled = !busy,
                modifier = Modifier.align(Alignment.End),
            ) {
                Text(stringResource(R.string.auth_forgot_password))
            }
        }
        val message = when {
            !session.configured -> AuthFeedback(R.string.auth_missing_configuration, error = true)
            feedback != null -> feedback
            notice != null -> AuthFeedback(notice)
            else -> null
        }
        if (message != null) AccessNotice(message)

        Button(
            onClick = ::submit,
            enabled = canSubmit,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp),
        ) {
            Text(stringResource(when {
                busy -> R.string.auth_wait
                recovery -> R.string.auth_send_recovery
                else -> mode.label
            }))
        }
        if (!recovery && session.googleConfigured && activity != null) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                HorizontalDivider(Modifier.weight(1f), color = MaterialTheme.colorScheme.outlineVariant)
                Text(
                    stringResource(R.string.auth_or),
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                HorizontalDivider(Modifier.weight(1f), color = MaterialTheme.colorScheme.outlineVariant)
            }
            GoogleSignInButton(enabled = !busy) {
                send(usingGoogle = true) {
                    session.signInWithGoogle(activity)
                    null
                }
            }
        }
    }
}
