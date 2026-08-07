package io.portone.wakbbu

import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.BadRequestException
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.portone.wakbbu.config.createDataSource
import io.portone.wakbbu.config.createDslContext
import io.portone.wakbbu.config.runMigration
import io.portone.wakbbu.repository.RestaurantRepository
import io.portone.wakbbu.repository.ReviewRepository
import io.portone.wakbbu.repository.SmashLogRepository
import io.portone.wakbbu.route.restaurantRoutes
import io.portone.wakbbu.route.reviewRoutes
import io.portone.wakbbu.route.shareRoutes
import io.portone.wakbbu.route.smashLogRoutes
import io.portone.wakbbu.slack.SlackWebhook
import kotlinx.serialization.json.Json

fun main() {
    val dataSource = createDataSource()
    runMigration(dataSource)
    val dsl = createDslContext(dataSource)
    val port = System.getenv("PORT")?.toIntOrNull() ?: 8080

    embeddedServer(Netty, port = port) {
        configurePlugins()
        routing {
            get("/health") { call.respondText("OK") }
            restaurantRoutes(RestaurantRepository(dsl))
            reviewRoutes(ReviewRepository(dsl))
            smashLogRoutes(SmashLogRepository(dsl))
            shareRoutes(System.getenv("SLACK_WEBHOOK_URL")?.let(::SlackWebhook))
        }
    }.start(wait = true)
}

fun Application.configurePlugins() {
    install(ContentNegotiation) {
        json(Json {
            ignoreUnknownKeys = true
            prettyPrint = true
        })
    }
    install(CORS) {
        anyHost()
        allowHeader(HttpHeaders.ContentType)
        allowMethod(HttpMethod.Put)
        allowMethod(HttpMethod.Delete)
    }
    install(StatusPages) {
        exception<BadRequestException> { call, cause ->
            call.respond(HttpStatusCode.BadRequest, mapOf("error" to (cause.message ?: "Bad Request")))
        }
    }
}
