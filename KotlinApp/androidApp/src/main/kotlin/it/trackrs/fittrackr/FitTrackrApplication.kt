package it.trackrs.fittrackr

import android.app.Application
import it.trackrs.fittrackr.auth.AccountSession
import it.trackrs.fittrackr.data.DiarySync
import it.trackrs.fittrackr.ui.AppearanceSettings

class FitTrackrApplication : Application() {
    internal val accountSession by lazy { AccountSession(this) }
    internal val diarySync by lazy { DiarySync(this, accountSession) }
    internal val appearance by lazy { AppearanceSettings(this) }
}
