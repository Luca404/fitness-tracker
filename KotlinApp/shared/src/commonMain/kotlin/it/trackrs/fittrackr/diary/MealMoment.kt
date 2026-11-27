package it.trackrs.fittrackr.diary

/** Keys used by the existing diary when grouping entries by meal. */
enum class MealMoment(val key: String) {
    Breakfast("breakfast"),
    Lunch("lunch"),
    Dinner("dinner"),
    Snack("snack"),
    Drinks("drinks"),
}
