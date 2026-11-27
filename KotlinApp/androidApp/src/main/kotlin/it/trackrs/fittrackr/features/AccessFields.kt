package it.trackrs.fittrackr.features

import androidx.annotation.StringRes
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import it.trackrs.fittrackr.R

@Composable
internal fun AccessNotice(message: AuthFeedback) {
    val colors = MaterialTheme.colorScheme
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = if (message.error) colors.errorContainer else colors.secondaryContainer,
        contentColor = if (message.error) colors.onErrorContainer else colors.onSecondaryContainer,
        modifier = Modifier.fillMaxWidth().semantics { liveRegion = LiveRegionMode.Polite },
    ) {
        Text(
            stringResource(message.label),
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(12.dp),
        )
    }
}

@Composable
internal fun AccessPassword(
    @StringRes label: Int,
    value: String,
    onChange: (String) -> Unit,
    enabled: Boolean,
    @StringRes error: Int?,
    @StringRes hint: Int? = null,
    next: Boolean = false,
    onDone: () -> Unit,
) {
    var visible by remember { mutableStateOf(false) }
    val support = error ?: hint
    OutlinedTextField(
        value, onChange, enabled = enabled, singleLine = true, isError = error != null,
        label = { Text(stringResource(label)) },
        supportingText = support?.let { { Text(stringResource(it)) } },
        visualTransformation = if (visible) VisualTransformation.None else PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = if (next) ImeAction.Next else ImeAction.Done),
        keyboardActions = KeyboardActions(onDone = { onDone() }),
        trailingIcon = if (value.isNotEmpty()) {
            { TextButton(onClick = { visible = !visible }, enabled = enabled) {
                Text(stringResource(if (visible) R.string.auth_hide_password else R.string.auth_show_password))
            } }
        } else null,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
    )
}
