package io.portone.wakbbu.route

import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.portone.wakbbu.domain.Review
import io.portone.wakbbu.repository.ReviewRepository
import kotlinx.serialization.Serializable
import java.util.UUID

@Serializable
data class ReviewRequest(
    val nickname: String,
    val content: String,
    val rating: Int,
)

fun Route.reviewRoutes(repo: ReviewRepository) {
    route("/api/restaurants/{restaurantId}/reviews") {
        get {
            val restaurantId = call.parameters["restaurantId"]!!
            call.respond(repo.findByRestaurantId(restaurantId))
        }

        post {
            val restaurantId = call.parameters["restaurantId"]!!
            val req = call.receive<ReviewRequest>()
            if (req.rating !in 1..5) {
                return@post call.respondError(HttpStatusCode.BadRequest, "rating must be between 1 and 5")
            }
            val review = Review(
                id = UUID.randomUUID().toString(),
                restaurantId = restaurantId,
                nickname = req.nickname,
                content = req.content,
                rating = req.rating,
            )
            call.respond(HttpStatusCode.Created, repo.create(review))
        }

        get("/{id}") {
            val id = call.parameters["id"]!!
            val review = repo.findById(id)
                ?: return@get call.respondError(HttpStatusCode.NotFound, "Review not found")
            call.respond(review)
        }

        put("/{id}") {
            val id = call.parameters["id"]!!
            val req = call.receive<ReviewRequest>()
            if (req.rating !in 1..5) {
                return@put call.respondError(HttpStatusCode.BadRequest, "rating must be between 1 and 5")
            }
            val updated = repo.update(id, req.nickname, req.content, req.rating)
                ?: return@put call.respondError(HttpStatusCode.NotFound, "Review not found")
            call.respond(updated)
        }

        delete("/{id}") {
            val id = call.parameters["id"]!!
            repo.delete(id)
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
