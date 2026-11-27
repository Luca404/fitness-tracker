package it.trackrs.fittrackr.features.meals

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import it.trackrs.fittrackr.R
import it.trackrs.fittrackr.data.AccountDiary
import it.trackrs.fittrackr.data.DownloadStatus
import it.trackrs.fittrackr.ui.PageBody
import it.trackrs.fittrackr.ui.appContentLocale
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import kotlinx.coroutines.flow.catch

@Composable
internal fun DiaryDownloadMessage(status: DownloadStatus, localError: Boolean, refresh: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.padding(vertical = 12.dp)) {
        when {
            localError -> Text(stringResource(R.string.meals_local_error))
            status == DownloadStatus.Failed -> {
                Text(stringResource(R.string.meals_download_error))
                Button(onClick = refresh) { Text(stringResource(R.string.retry)) }
            }
            else -> {
                Text(stringResource(R.string.meals_downloading))
                LinearProgressIndicator(Modifier.fillMaxWidth())
            }
        }
    }
}

@Composable
internal fun DiaryRefreshMessage(status: DownloadStatus, refresh: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        val label = if (status == DownloadStatus.Failed) R.string.meals_saved_copy else R.string.meals_refreshing
        Text(stringResource(label), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (status == DownloadStatus.Failed) {
            TextButton(onClick = refresh) { Text(stringResource(R.string.retry)) }
        } else {
            LinearProgressIndicator(Modifier.fillMaxWidth())
        }
    }
}

@Composable
internal fun DiaryDownloadScreen(diary: AccountDiary?, refresh: () -> Unit) {
    val status = diary?.downloadStatus?.collectAsState()?.value ?: DownloadStatus.Downloading
    val lastDownload = remember(diary) { diary?.local?.observeLastDownload()?.catch { emit(null) } }
        ?.collectAsState(initial = null)?.value
    val locale = appContentLocale()
    val formatter = remember(locale) {
        DateTimeFormatter.ofLocalizedDateTime(FormatStyle.MEDIUM, FormatStyle.SHORT)
            .withLocale(locale).withZone(ZoneId.systemDefault())
    }
    PageBody(stringResource(R.string.sync)) {
        lastDownload?.let {
            Text(stringResource(R.string.meals_last_download, formatter.format(Instant.ofEpochMilli(it))))
            Spacer(Modifier.height(12.dp))
        }
        when (status) {
            DownloadStatus.Ready -> Button(onClick = refresh) { Text(stringResource(R.string.meals_refresh)) }
            else -> if (lastDownload == null) DiaryDownloadMessage(status, localError = false, refresh)
                else DiaryRefreshMessage(status, refresh)
        }
    }
}
