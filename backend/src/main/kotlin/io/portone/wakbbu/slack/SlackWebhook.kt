package io.portone.wakbbu.slack

import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration

class SlackClient(private val token: String, private val channel: String) {
    private val client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(5))
        .build()

    fun send(message: JsonObject): Boolean {
        val payload = buildJsonObject {
            put("channel", channel)
            message["text"]?.let { put("text", it) }
            message["blocks"]?.let { put("blocks", it) }
        }
        val request = HttpRequest.newBuilder(URI.create("https://slack.com/api/chat.postMessage"))
            .header("Content-Type", "application/json")
            .header("Authorization", "Bearer $token")
            .timeout(Duration.ofSeconds(10))
            .POST(HttpRequest.BodyPublishers.ofString(payload.toString()))
            .build()
        val response = client.send(request, HttpResponse.BodyHandlers.ofString())
        return response.statusCode() in 200..299
    }
}
