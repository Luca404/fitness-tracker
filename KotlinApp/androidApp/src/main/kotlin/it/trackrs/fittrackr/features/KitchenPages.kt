package it.trackrs.fittrackr.features

import it.trackrs.fittrackr.navigation.Page.*

internal val kitchenLinks = mapOf(
    Kitchen to listOf(Ingredients, Dishes),
    Ingredients to listOf(Ingredient, AddIngredient),
    AddIngredient to listOf(Barcode, LabelPhoto),
    Dishes to listOf(Recipe, Preparation),
    Preparation to listOf(Portion),
    Portion to listOf(ReviewMeal),
)
