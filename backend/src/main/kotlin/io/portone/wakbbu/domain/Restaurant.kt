package io.portone.wakbbu.domain

import kotlinx.serialization.Serializable

@Serializable
enum class FoodCategory { korean, chinese, japanese, western, asian, cafe, snack, etc }

@Serializable
enum class DiningMode { `dine-in`, delivery }

@Serializable
data class Restaurant(
    val id: String,
    val name: String,
    val category: FoodCategory,
    val description: String,
    val address: String,
    val phone: String? = null,
    val hours: String? = null,
    val note: String? = null,
    val closed: Boolean = false,
    val distanceFromStation: String,
    val priceRange: String,
    val availableModes: List<DiningMode>,
    val tags: List<String>,
    val imageUrl: String? = null,
    val mapUrl: String? = null,
    val deliveryApps: List<String> = emptyList(),
    val createdAt: String? = null,
)
