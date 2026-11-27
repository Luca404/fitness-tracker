package it.trackrs.fittrackr.auth

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.AtomicFile
import io.github.jan.supabase.auth.SessionManager
import io.github.jan.supabase.auth.user.UserSession
import java.io.File
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json

internal class AndroidSessionStore(context: Context, project: String) : SessionManager {
    private val file = AtomicFile(File(context.noBackupFilesDir, "auth-$project"))
    private val keyName = "fittrackr-auth-$project"
    private val activity = context.getSharedPreferences("auth-activity-$project", Context.MODE_PRIVATE)
    private val lock = Mutex()
    private val json = Json { encodeDefaults = true }

    fun isInactive(now: Long): Boolean {
        val lastUsed = activity.getLong("last_used", 0)
        return lastUsed <= 0L || now < lastUsed || now - lastUsed >= inactivityMillis
    }

    fun markUsed(now: Long) {
        activity.edit().putLong("last_used", now).apply()
    }

    override suspend fun saveSession(session: UserSession) = withContext(Dispatchers.IO) {
        lock.withLock {
            val cipher = Cipher.getInstance(cipherName)
            cipher.init(Cipher.ENCRYPT_MODE, key(create = true))
            val cleartext = json.encodeToString(UserSession.serializer(), session).encodeToByteArray()
            val encrypted = cipher.iv + cipher.doFinal(cleartext)
            if (!activity.contains("last_used")) markUsed(System.currentTimeMillis())
            val output = file.startWrite()
            try {
                output.write(encrypted)
                file.finishWrite(output)
            } catch (error: Exception) {
                file.failWrite(output)
                throw error
            }
        }
    }

    override suspend fun loadSession(): UserSession? = withContext(Dispatchers.IO) {
        lock.withLock {
            try {
                val data = file.readFully()
                val secret = key(create = false) ?: return@withLock null
                require(data.size > ivSize)
                val cipher = Cipher.getInstance(cipherName)
                cipher.init(Cipher.DECRYPT_MODE, secret, GCMParameterSpec(128, data, 0, ivSize))
                val cleartext = cipher.doFinal(data, ivSize, data.size - ivSize).decodeToString()
                json.decodeFromString(UserSession.serializer(), cleartext)
            } catch (_: Exception) {
                null
            }
        }
    }

    override suspend fun deleteSession() = withContext(Dispatchers.IO) {
        lock.withLock {
            file.delete()
            activity.edit().remove("last_used").apply()
        }
    }

    private fun key(create: Boolean): SecretKey? {
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (keyStore.getKey(keyName, null) as? SecretKey)?.let { return it }
        if (!create) return null
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").run {
            init(KeyGenParameterSpec.Builder(
                keyName, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            ).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build())
            generateKey()
        }
    }

    private companion object {
        const val cipherName = "AES/GCM/NoPadding"
        const val ivSize = 12
        const val inactivityMillis = 30L * 24 * 60 * 60 * 1000
    }
}
