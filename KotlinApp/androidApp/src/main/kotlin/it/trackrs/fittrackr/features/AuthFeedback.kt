package it.trackrs.fittrackr.features

import androidx.annotation.StringRes
import io.github.jan.supabase.exceptions.HttpRequestException
import io.github.jan.supabase.exceptions.RestException
import io.ktor.client.plugins.HttpRequestTimeoutException
import it.trackrs.fittrackr.R
import java.io.IOException

internal data class AuthFeedback(@param:StringRes val label: Int, val error: Boolean = false)

@StringRes
internal fun authErrorMessage(error: Exception): Int {
    if (error is HttpRequestException || error is HttpRequestTimeoutException || error is IOException) {
        return R.string.auth_network_error
    }
    val response = error as? RestException ?: return R.string.auth_general_error
    if (response.statusCode == 429) return R.string.auth_rate_limit
    return when (response.error) {
        "invalid_credentials" -> R.string.auth_invalid_credentials
        "email_not_confirmed" -> R.string.auth_email_unconfirmed
        "weak_password" -> R.string.auth_weak_password
        else -> R.string.auth_general_error
    }
}
