package io.portone.wakbbu.route

import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.portone.wakbbu.domain.SmashLog
import io.portone.wakbbu.repository.SmashLogRepository
import kotlinx.serialization.Serializable
import java.util.UUID

@Serializable
data class CreateSmashLogRequest(
    val restaurantId: String,
    val mode: String,
)

fun Route.smashLogRoutes(repo: SmashLogRepository) {
    route("/api/smash-logs") {
        post {
            val req = call.receive<CreateSmashLogRequest>()
            val entry = SmashLog(
                id = UUID.randomUUID().toString(),
                restaurantId = req.restaurantId,
                mode = req.mode,
            )
            repo.log(entry)
            call.respond(HttpStatusCode.Created, entry)
        }

        get("/stats") {
            call.respond(repo.stats())
        }
    }
}
