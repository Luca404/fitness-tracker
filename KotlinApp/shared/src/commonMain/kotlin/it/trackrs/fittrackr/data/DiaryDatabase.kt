package it.trackrs.fittrackr.data

import androidx.room.ConstructedBy
import androidx.room.Database
import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.RoomDatabase
import androidx.room.RoomDatabaseConstructor
import androidx.sqlite.driver.bundled.BundledSQLiteDriver
import it.trackrs.fittrackr.diary.HabitEvaluator
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.IO
import kotlinx.coroutines.flow.map

@Entity(tableName = "diary_download")
internal data class DownloadRecord(@PrimaryKey val id: Int = 0, val completedAt: Long)

@Database(
    entities = [
        MealRecord::class, MealEntryRecord::class, MealItemRecord::class,
        GoalsRecord::class, HealthProfileRecord::class, WeightRecord::class, WorkoutRecord::class,
        GymSessionRecord::class, GymSetRecord::class, DownloadRecord::class,
    ],
    version = 1,
)
@ConstructedBy(DiaryDatabaseConstructor::class)
internal abstract class DiaryDatabase : RoomDatabase() {
    abstract fun diary(): DiaryDao
}

@Suppress("KotlinNoActualForExpect")
internal expect object DiaryDatabaseConstructor : RoomDatabaseConstructor<DiaryDatabase>

class LocalDiary internal constructor(private val database: DiaryDatabase, private val habits: HabitEvaluator) {
    private val dao get() = database.diary()

    fun observeDay(date: String, weekStart: String) = dao.observeDownload().map { download ->
        if (download == null) null else dao.readDay(date, weekStart, habits)
    }

    fun observeLastDownload() = dao.observeDownload().map { it?.completedAt }

    suspend fun replace(download: DiaryDownload, completedAt: Long) {
        dao.replace(download, DownloadRecord(completedAt = completedAt))
    }

    fun close() = database.close()
}

internal fun openDiary(builder: RoomDatabase.Builder<DiaryDatabase>, habits: HabitEvaluator) = LocalDiary(
    builder.setDriver(BundledSQLiteDriver()).setQueryCoroutineContext(Dispatchers.IO).build(),
    habits,
)
