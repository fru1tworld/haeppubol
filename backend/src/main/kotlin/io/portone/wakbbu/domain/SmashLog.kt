package io.portone.wakbbu.domain

import kotlinx.serialization.Serializable

@Serializable
data class SmashLog(
    val id: String,
    val restaurantId: String,
    val mode: String,
    val smashedAt: String? = null,
)

@Serializable
data class SmashStats(
    val totalSmashes: Int,
    val topRestaurants: List<TopRestaurant>,
)

@Serializable
data class TopRestaurant(
    val restaurantId: String,
    val name: String,
    val count: Int,
)
