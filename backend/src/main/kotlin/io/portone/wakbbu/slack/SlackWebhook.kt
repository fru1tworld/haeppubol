package io.portone.wakbbu.slack

import kotlinx.serialization.json.JsonObject
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration

/** Slack Incoming Webhook 호출. IO 셸 — 얇게 유지하고 테스트하지 않는다. */
class SlackWebhook(private val url: String) {
    private val client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(5))
        .build()

    /** 성공하면 true, Slack이 2xx 외를 돌려주면 false */
    fun send(message: JsonObject): Boolean {
        val request = HttpRequest.newBuilder(URI.create(url))
            .header("Content-Type", "application/json")
            .timeout(Duration.ofSeconds(10))
            .POST(HttpRequest.BodyPublishers.ofString(message.toString()))
            .build()
        val response = client.send(request, HttpResponse.BodyHandlers.ofString())
        return response.statusCode() in 200..299
    }
}
