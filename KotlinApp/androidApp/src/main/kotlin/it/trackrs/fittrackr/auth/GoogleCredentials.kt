package it.trackrs.fittrackr.auth

import android.app.Activity
import android.content.Context
import android.util.Base64
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.ClearCredentialException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import java.security.MessageDigest
import java.security.SecureRandom

internal class GoogleCredentials(context: Context, private val webClientId: String) {
    private val credentialManager = CredentialManager.create(context)
    private val random = SecureRandom()

    suspend fun selectAccount(activity: Activity): GoogleIdentity {
        val nonceBytes = ByteArray(32).also(random::nextBytes)
        val nonce = Base64.encodeToString(nonceBytes, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)
        val hashedNonce = MessageDigest.getInstance("SHA-256").digest(nonce.encodeToByteArray())
            .joinToString("") { "%02x".format(it) }
        val option = GetSignInWithGoogleOption.Builder(webClientId).setNonce(hashedNonce).build()
        val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
        val credential = credentialManager.getCredential(activity, request).credential
        check(credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL)
        return GoogleIdentity(GoogleIdTokenCredential.createFrom(credential.data).idToken, nonce)
    }

    suspend fun clearState() {
        try {
            credentialManager.clearCredentialState(ClearCredentialStateRequest())
        } catch (_: ClearCredentialException) {
            // The provider may be unavailable during local sign-out.
        }
    }
}

internal class GoogleIdentity(val idToken: String, val nonce: String)
