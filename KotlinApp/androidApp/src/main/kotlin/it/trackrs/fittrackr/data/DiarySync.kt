package it.trackrs.fittrackr.data

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.util.Log
import java.util.concurrent.atomic.AtomicReference
import it.trackrs.fittrackr.auth.AccountAccess
import it.trackrs.fittrackr.auth.AccountSession
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onSubscription
import kotlinx.coroutines.launch

internal enum class DownloadStatus { Downloading, Ready, Failed }

internal class AccountDiary(val userId: String, val local: LocalDiary) {
    private val status = MutableStateFlow(DownloadStatus.Downloading)
    val downloadStatus = status.asStateFlow()

    suspend fun refresh(remote: DiaryRemote) {
        status.value = DownloadStatus.Downloading
        try {
            val data = remote.download()
            currentCoroutineContext().ensureActive()
            local.replace(data, System.currentTimeMillis())
            status.value = DownloadStatus.Ready
        } catch (cancelled: CancellationException) {
            throw cancelled
        } catch (error: Exception) {
            // Error messages from the data API can contain personal values.
            Log.w("DiarySync", "Download failed (${error.javaClass.simpleName})")
            status.value = DownloadStatus.Failed
        }
    }
}

internal class DiarySync(context: Context, session: AccountSession) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val refreshes = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    private val account = MutableStateFlow<AccountDiary?>(null)
    private val habits by lazy { loadHabitEvaluator(context) }
    val active = account.asStateFlow()

    init {
        val connectivity = context.getSystemService(ConnectivityManager::class.java)
        val connected = AtomicReference<Network?>()
        connectivity.registerDefaultNetworkCallback(object : ConnectivityManager.NetworkCallback() {
            override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) {
                if (capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)) {
                    if (connected.getAndSet(network) != network) refresh()
                } else {
                    connected.compareAndSet(network, null)
                }
            }

            override fun onLost(network: Network) {
                connected.compareAndSet(network, null)
            }
        })
        scope.launch {
            session.state.map { (it as? AccountAccess.SignedIn)?.userId }.distinctUntilChanged()
                .collectLatest { userId ->
                    if (userId == null) return@collectLatest
                    val local = openLocalDiary(context, session.url, userId, habits)
                    try {
                        val current = AccountDiary(userId, local)
                        account.value = current
                        val remote = DiaryRemote(requireNotNull(session.client), userId)
                        refreshes.onSubscription { emit(Unit) }.collect { current.refresh(remote) }
                    } finally {
                        account.value = null
                        local.close()
                    }
                }
        }
    }

    fun refresh() {
        refreshes.tryEmit(Unit)
    }
}
