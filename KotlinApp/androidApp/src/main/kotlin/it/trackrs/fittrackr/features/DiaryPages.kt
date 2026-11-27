package it.trackrs.fittrackr.features

import it.trackrs.fittrackr.navigation.Page.*

internal val diaryLinks = mapOf(
    AddMeal to listOf(Ingredients, Dishes, MealPhoto, ReviewMeal),
    MealPhoto to listOf(ReviewMeal),
    Weight to listOf(LogWeight),
    History to listOf(HistoryDay),
    HistoryDay to listOf(MealEntry, SessionSummary),
    Points to listOf(DayPoints, Ranking),
)
