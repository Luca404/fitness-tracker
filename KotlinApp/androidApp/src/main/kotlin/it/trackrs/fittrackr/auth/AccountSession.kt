package it.trackrs.fittrackr.auth

import android.app.Activity
import android.content.Context
import android.net.Uri
import androidx.annotation.StringRes
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.SignOutScope
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.Google
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.auth.providers.builtin.IDToken
import io.github.jan.supabase.auth.status.SessionStatus
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import it.trackrs.fittrackr.BuildConfig
import it.trackrs.fittrackr.R
import java.util.UUID
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext

internal sealed interface AccountAccess {
    data object Loading : AccountAccess
    data class SignedOut(@param:StringRes val notice: Int? = null) : AccountAccess
    data class SignedIn(val userId: String, val email: String?) : AccountAccess
}

internal class AccountSession(context: Context) {
    val url = BuildConfig.SUPABASE_URL.trimEnd('/')
    private val webUrl = BuildConfig.AUTH_WEB_URL.trimEnd('/')
    val configured = isHttpsUrl(url) && BuildConfig.SUPABASE_PUBLISHABLE_KEY.isNotBlank() && isHttpsUrl(webUrl)
    private val store = AndroidSessionStore(context, UUID.nameUUIDFromBytes(url.encodeToByteArray()).toString())
    val client = if (configured) {
        createSupabaseClient(url, BuildConfig.SUPABASE_PUBLISHABLE_KEY) {
            coroutineDispatcher = Dispatchers.Main.immediate
            install(Auth) {
                sessionManager = store
                autoLoadFromStorage = false
                enableLifecycleCallbacks = false
            }
            install(Postgrest) {
                requireValidSession = true
            }
        }
    } else null
    private val auth = client?.auth
    private val google = BuildConfig.GOOGLE_WEB_CLIENT_ID
        .takeIf { configured && it.endsWith(".apps.googleusercontent.com") }
        ?.let { GoogleCredentials(context, it) }
    val googleConfigured get() = google != null
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val lock = Mutex()
    private val access = MutableStateFlow<AccountAccess>(AccountAccess.Loading)
    val state = access.asStateFlow()
    private var initialized = false

    fun onForeground() {
        scope.launch {
            lock.withLock {
                val now = System.currentTimeMillis()
                if (!initialized) {
                    restore(now)
                    initialized = true
                    observeSession()
                } else if (access.value is AccountAccess.SignedIn && store.isInactive(now)) {
                    access.value = AccountAccess.SignedOut(R.string.auth_inactive)
                    clearSession()
                }
                markUsed()
            }
        }
    }

    fun markUsed() {
        if (access.value is AccountAccess.SignedIn) store.markUsed(System.currentTimeMillis())
    }

    suspend fun signIn(email: String, password: String) = lock.withLock {
        requireNotNull(auth).signInWith(Email) {
            this.email = email
            this.password = password
        }
    }

    suspend fun signInWithGoogle(activity: Activity) = lock.withLock {
        val identity = requireNotNull(google).selectAccount(activity)
        requireNotNull(auth).signInWith(IDToken) {
            provider = Google
            idToken = identity.idToken
            nonce = identity.nonce
        }
    }

    suspend fun register(email: String, password: String) = lock.withLock {
        requireNotNull(auth).signUpWith(Email, redirectUrl = "$webUrl/") {
            this.email = email
            this.password = password
        }
    }

    suspend fun recover(email: String) = lock.withLock {
        requireNotNull(auth).resetPasswordForEmail(email, redirectUrl = "$webUrl/reset-password")
    }

    suspend fun signOut() = lock.withLock {
        withContext(NonCancellable) {
            auth?.stopAutoRefreshForCurrentSession()
            try {
                auth?.signOut(SignOutScope.LOCAL)
            } catch (_: Exception) {
                clearSession()
            }
            access.value = AccountAccess.SignedOut()
            google?.clearState()
        }
    }

    private suspend fun restore(now: Long) {
        val session = auth?.let { store.loadSession() }
        val user = session?.user
        if (session == null || user == null || store.isInactive(now)) {
            clearSession()
            access.value = AccountAccess.SignedOut(if (user == null) null else R.string.auth_inactive)
            return
        }
        val clientAuth = requireNotNull(auth)
        try {
            clientAuth.importSession(session)
            access.value = AccountAccess.SignedIn(user.id, user.email)
        } catch (error: CancellationException) {
            throw error
        } catch (_: Exception) {
            clearSession()
            access.value = AccountAccess.SignedOut(R.string.auth_sign_in_again)
        }
    }

    private fun observeSession() {
        val statuses = auth?.sessionStatus ?: return
        scope.launch {
            statuses.collect {
                lock.withLock {
                    when (val status = statuses.value) {
                        is SessionStatus.Authenticated -> status.session.user?.let { user ->
                            access.value = AccountAccess.SignedIn(user.id, user.email)
                        }
                        is SessionStatus.NotAuthenticated -> {
                            if (status.isSignOut && access.value is AccountAccess.SignedIn) {
                                access.value = AccountAccess.SignedOut(R.string.auth_sign_in_again)
                            }
                        }
                        SessionStatus.Initializing, is SessionStatus.RefreshFailure -> Unit
                    }
                }
            }
        }
    }

    private suspend fun clearSession() {
        auth?.stopAutoRefreshForCurrentSession()
        auth?.clearSession()
    }
}

private fun isHttpsUrl(url: String): Boolean =
    Uri.parse(url).let { it.scheme == "https" && !it.host.isNullOrBlank() }
