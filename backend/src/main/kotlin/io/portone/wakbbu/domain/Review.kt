package io.portone.wakbbu.domain

import kotlinx.serialization.Serializable

@Serializable
data class Review(
    val id: String,
    val restaurantId: String,
    val nickname: String,
    val content: String,
    val rating: Int,
    val createdAt: String? = null,
)
