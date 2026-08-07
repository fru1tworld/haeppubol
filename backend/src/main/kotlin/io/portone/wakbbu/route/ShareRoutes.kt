package io.portone.wakbbu.route

import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.portone.wakbbu.slack.LunchShare
import io.portone.wakbbu.slack.MingleShare
import io.portone.wakbbu.slack.CustomShare
import io.portone.wakbbu.slack.SlackClient
import io.portone.wakbbu.slack.customMessage
import io.portone.wakbbu.slack.lunchMessage
import io.portone.wakbbu.slack.mingleMessage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable

@Serializable
data class LunchShareRequest(
    val name: String,
    val category: String,
    val mode: String,
    val address: String = "",
    val distanceFromStation: String = "",
    val priceRange: String = "",
    val mapUrl: String? = null,
)

@Serializable
data class MingleShareRequest(
    val winner: String,
    val teams: List<String>,
)

@Serializable
data class CustomShareRequest(
    val ballName: String,
    val result: String,
    val items: List<String>,
)

fun Route.shareRoutes(webhook: SlackClient?) {
    route("/api/share") {
        post("/lunch") {
            if (webhook == null) {
                return@post call.respondError(HttpStatusCode.ServiceUnavailable, "SLACK_WEBHOOK_URL is not configured")
            }
            val req = call.receive<LunchShareRequest>()
            if (req.name.isBlank()) {
                return@post call.respondError(HttpStatusCode.BadRequest, "name must not be blank")
            }
            val message = lunchMessage(
                LunchShare(
                    name = req.name,
                    category = req.category,
                    mode = req.mode,
                    address = req.address,
                    distanceFromStation = req.distanceFromStation,
                    priceRange = req.priceRange,
                    mapUrl = req.mapUrl,
                ),
            )
            val ok = withContext(Dispatchers.IO) { webhook.send(message) }
            if (!ok) {
                return@post call.respondError(HttpStatusCode.BadGateway, "slack webhook rejected the message")
            }
            call.respond(HttpStatusCode.NoContent)
        }

        post("/mingle") {
            if (webhook == null) {
                return@post call.respondError(HttpStatusCode.ServiceUnavailable, "SLACK_WEBHOOK_URL is not configured")
            }
            val req = call.receive<MingleShareRequest>()
            if (req.winner.isBlank()) {
                return@post call.respondError(HttpStatusCode.BadRequest, "winner must not be blank")
            }
            if (req.teams.isEmpty()) {
                return@post call.respondError(HttpStatusCode.BadRequest, "teams must not be empty")
            }
            val ok = withContext(Dispatchers.IO) {
                webhook.send(mingleMessage(MingleShare(winner = req.winner, teams = req.teams)))
            }
            if (!ok) {
                return@post call.respondError(HttpStatusCode.BadGateway, "slack webhook rejected the message")
            }
            call.respond(HttpStatusCode.NoContent)
        }

        post("/custom") {
            if (webhook == null) {
                return@post call.respondError(HttpStatusCode.ServiceUnavailable, "SLACK_WEBHOOK_URL is not configured")
            }
            val req = call.receive<CustomShareRequest>()
            if (req.result.isBlank()) {
                return@post call.respondError(HttpStatusCode.BadRequest, "result must not be blank")
            }
            val ok = withContext(Dispatchers.IO) {
                webhook.send(
                    customMessage(
                        CustomShare(
                            ballName = req.ballName,
                            result = req.result,
                            items = req.items,
                        ),
                    ),
                )
            }
            if (!ok) {
                return@post call.respondError(HttpStatusCode.BadGateway, "slack webhook rejected the message")
            }
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
