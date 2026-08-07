package io.portone.wakbbu.route

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.portone.wakbbu.domain.DiningMode
import io.portone.wakbbu.domain.FoodCategory

internal suspend fun ApplicationCall.respondError(status: HttpStatusCode, message: String) =
    respond(status, mapOf("error" to message))

internal fun parseCategory(value: String): FoodCategory? =
    FoodCategory.entries.find { it.name == value }

internal fun parseMode(value: String): DiningMode? =
    DiningMode.entries.find { it.name == value }
