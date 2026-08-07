package io.portone.wakbbu.route

import io.ktor.http.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.portone.wakbbu.repository.MingleTeamRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable

@Serializable
data class MingleTeamsResponse(val teams: List<String>)

@Serializable
data class MingleTeamAddRequest(val name: String)

@Serializable
data class MingleTeamsReplaceRequest(val teams: List<String>)

fun Route.mingleTeamRoutes(repo: MingleTeamRepository) {
    route("/api/mingle-teams") {
        get {
            val teams = withContext(Dispatchers.IO) { repo.findAll() }
            call.respond(MingleTeamsResponse(teams))
        }

        post {
            val req = call.receive<MingleTeamAddRequest>()
            if (req.name.isBlank()) {
                return@post call.respondError(HttpStatusCode.BadRequest, "name must not be blank")
            }
            withContext(Dispatchers.IO) { repo.add(req.name.trim()) }
            call.respond(HttpStatusCode.Created)
        }

        put {
            val req = call.receive<MingleTeamsReplaceRequest>()
            val cleaned = req.teams.map { it.trim() }.filter { it.isNotBlank() }.distinct()
            withContext(Dispatchers.IO) { repo.replaceAll(cleaned) }
            call.respond(MingleTeamsResponse(cleaned))
        }

        delete("/{name}") {
            val name = call.parameters["name"] ?: return@delete call.respondError(HttpStatusCode.BadRequest, "name required")
            withContext(Dispatchers.IO) { repo.remove(name) }
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
