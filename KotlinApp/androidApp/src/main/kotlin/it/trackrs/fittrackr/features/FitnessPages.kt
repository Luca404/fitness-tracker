package it.trackrs.fittrackr.features

import it.trackrs.fittrackr.navigation.Page.*

internal val fitnessLinks = mapOf(
    Fitness to listOf(Plans, Activity, Progress),
    Plans to listOf(Plan),
    Plan to listOf(Session, EditPlan),
    Session to listOf(SessionSummary),
    Progress to listOf(ExerciseProgress),
)
