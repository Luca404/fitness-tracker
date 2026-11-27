package it.trackrs.fittrackr.features

import it.trackrs.fittrackr.navigation.Page.*

internal val accountLinks = mapOf(
    Settings to listOf(Account, Goals, Appearance, Language, Numbers, Reminders, Sync, Guide),
    Physical to listOf(Objective),
    Objective to listOf(Lifestyle),
    Lifestyle to listOf(Training),
    Training to listOf(Targets),
    Targets to listOf(Tutorial),
    Guide to listOf(Tutorial),
)
