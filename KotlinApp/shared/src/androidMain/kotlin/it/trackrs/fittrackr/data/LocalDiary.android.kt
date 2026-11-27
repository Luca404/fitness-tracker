package it.trackrs.fittrackr.data

import android.content.Context
import androidx.room.Room
import it.trackrs.fittrackr.diary.HabitEvaluator
import java.io.File
import java.util.UUID

fun openLocalDiary(context: Context, project: String, userId: String, habits: HabitEvaluator): LocalDiary {
    val account = UUID.nameUUIDFromBytes("$project/$userId".encodeToByteArray())
    val database = File(context.noBackupFilesDir, "diary-$account.sqlite")
    return openDiary(Room.databaseBuilder<DiaryDatabase>(context, database.absolutePath), habits)
}
