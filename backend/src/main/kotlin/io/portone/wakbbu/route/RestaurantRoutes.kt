package io.portone.wakbbu.route

import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.portone.wakbbu.domain.DiningMode
import io.portone.wakbbu.domain.FoodCategory
import io.portone.wakbbu.domain.Restaurant
import io.portone.wakbbu.repository.RestaurantRepository
import io.portone.wakbbu.repository.UpdateRestaurantError
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import java.util.UUID

@Serializable
data class CreateRestaurantRequest(
    val name: String,
    val category: FoodCategory,
    val description: String = "",
    val address: String = "",
    val phone: String? = null,
    val hours: String? = null,
    val note: String? = null,
    val closed: Boolean = false,
    val distanceFromStation: String = "",
    val priceRange: String = "",
    val availableModes: List<DiningMode> = emptyList(),
    val tags: List<String> = emptyList(),
    val imageUrl: String? = null,
    val mapUrl: String? = null,
    val deliveryApps: List<String> = emptyList(),
)

fun Route.restaurantRoutes(repo: RestaurantRepository) {
    route("/api/restaurants") {
        get {
            val categoryParam = call.queryParameters["category"]
            val category = categoryParam?.let(::parseCategory)
            if (categoryParam != null && category == null) {
                return@get call.respondError(HttpStatusCode.BadRequest, "invalid category: $categoryParam")
            }
            val modeParam = call.queryParameters["mode"]
            val mode = modeParam?.let(::parseMode)
            if (modeParam != null && mode == null) {
                return@get call.respondError(HttpStatusCode.BadRequest, "invalid mode: $modeParam")
            }
            call.respond(repo.findAll(category, mode, call.queryParameters["search"]))
        }

        get("/random") {
            val modeParam = call.queryParameters["mode"]
                ?: return@get call.respondError(HttpStatusCode.BadRequest, "mode is required")
            val mode = parseMode(modeParam)
                ?: return@get call.respondError(HttpStatusCode.BadRequest, "invalid mode: $modeParam")
            val categoryParam = call.queryParameters["category"]
            val category = categoryParam?.let(::parseCategory)
            if (categoryParam != null && category == null) {
                return@get call.respondError(HttpStatusCode.BadRequest, "invalid category: $categoryParam")
            }
            val restaurant = repo.findRandom(mode, category)
                ?: return@get call.respondError(HttpStatusCode.NotFound, "No restaurant found")
            call.respond(restaurant)
        }

        get("/{id}") {
            val id = call.parameters["id"]!!
            val restaurant = repo.findById(id)
                ?: return@get call.respondError(HttpStatusCode.NotFound, "Restaurant not found")
            call.respond(restaurant)
        }

        post {
            val req = call.receive<CreateRestaurantRequest>()
            val restaurant = Restaurant(
                id = UUID.randomUUID().toString(),
                name = req.name,
                category = req.category,
                description = req.description,
                address = req.address,
                phone = req.phone,
                hours = req.hours,
                note = req.note,
                closed = req.closed,
                distanceFromStation = req.distanceFromStation,
                priceRange = req.priceRange,
                availableModes = req.availableModes,
                tags = req.tags,
                imageUrl = req.imageUrl,
                mapUrl = req.mapUrl,
                deliveryApps = req.deliveryApps,
            )
            call.respond(HttpStatusCode.Created, repo.create(restaurant))
        }

        put("/{id}") {
            val id = call.parameters["id"]!!
            val patch = call.receive<Map<String, kotlinx.serialization.json.JsonElement>>()
            val converted = patch.mapValues { (_, v) ->
                when (v) {
                    is JsonPrimitive -> v.content
                    is JsonArray -> v.map { (it as JsonPrimitive).content }
                    else -> v.toString()
                }
            }
            repo.update(id, converted).fold(
                { error ->
                    when (error) {
                        is UpdateRestaurantError.UnknownField ->
                            call.respondError(HttpStatusCode.BadRequest, "unknown field: ${error.name}")
                        is UpdateRestaurantError.InvalidValue ->
                            call.respondError(HttpStatusCode.BadRequest, "invalid value for field: ${error.name}")
                        UpdateRestaurantError.NotFound ->
                            call.respondError(HttpStatusCode.NotFound, "Restaurant not found")
                    }
                },
                { call.respond(it) },
            )
        }

        delete("/{id}") {
            val id = call.parameters["id"]!!
            repo.delete(id)
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
