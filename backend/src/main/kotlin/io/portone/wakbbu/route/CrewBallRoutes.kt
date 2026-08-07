package io.portone.wakbbu.route

import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.portone.wakbbu.repository.CrewBall
import io.portone.wakbbu.repository.CrewBallRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable

@Serializable
data class CreateCrewBallRequest(
    val name: String,
    val author: String,
    val items: List<String> = emptyList(),
    val shellColor: String? = null,
    val coreColor: String? = null,
    val tagline: String? = null,
    val photo: String? = null,
    val background: String? = null,
    val sound: String? = null,
    val healMode: Boolean = false,
)

fun Route.crewBallRoutes(repo: CrewBallRepository) {
    route("/api/crew-balls") {
        get {
            val balls = withContext(Dispatchers.IO) { repo.findAll() }
            call.respond(balls)
        }

        get("/{id}") {
            val id = call.parameters["id"]
                ?: return@get call.respondError(HttpStatusCode.BadRequest, "id required")
            val ball = withContext(Dispatchers.IO) { repo.findById(id) }
                ?: return@get call.respondError(HttpStatusCode.NotFound, "not found")
            call.respond(ball)
        }

        post {
            val req = call.receive<CreateCrewBallRequest>()
            if (req.name.isBlank()) {
                return@post call.respondError(HttpStatusCode.BadRequest, "name must not be blank")
            }
            val ball = CrewBall(
                id = "crew-${System.currentTimeMillis()}",
                name = req.name.trim(),
                author = req.author.trim(),
                items = req.items,
                shellColor = req.shellColor,
                coreColor = req.coreColor,
                tagline = req.tagline,
                photo = req.photo,
                background = req.background,
                sound = req.sound,
                healMode = req.healMode,
                createdAt = java.time.Instant.now().toString(),
            )
            withContext(Dispatchers.IO) { repo.create(ball) }
            call.respond(HttpStatusCode.Created, ball)
        }

        delete("/{id}") {
            val id = call.parameters["id"]
                ?: return@delete call.respondError(HttpStatusCode.BadRequest, "id required")
            withContext(Dispatchers.IO) { repo.delete(id) }
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
