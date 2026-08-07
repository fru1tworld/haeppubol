package io.portone.wakbbu.slack

import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import kotlinx.serialization.json.putJsonObject

// Slack Incoming Webhook에 보낼 Block Kit 페이로드. 순수 변환만 한다.

data class LunchShare(
    val name: String,
    val category: String,
    val mode: String,
    val address: String,
    val distanceFromStation: String,
    val priceRange: String,
    val mapUrl: String?,
)

data class MingleShare(
    val winner: String,
    val teams: List<String>,
)

private fun header(text: String): JsonObject = buildJsonObject {
    put("type", "header")
    putJsonObject("text") {
        put("type", "plain_text")
        put("text", text)
    }
}

private fun markdownSection(text: String): JsonObject = buildJsonObject {
    put("type", "section")
    putJsonObject("text") {
        put("type", "mrkdwn")
        put("text", text)
    }
}

private fun context(text: String): JsonObject = buildJsonObject {
    put("type", "context")
    putJsonArray("elements") {
        add(buildJsonObject {
            put("type", "mrkdwn")
            put("text", text)
        })
    }
}

fun lunchMessage(share: LunchShare): JsonObject = buildJsonObject {
    put("text", "오늘 점심은 ${share.name}")
    put("blocks", buildJsonArray {
        add(header("오늘 점심 추첨 결과"))
        add(
            markdownSection(
                buildString {
                    append("*${share.name}* · ${share.category}\n")
                    append("${share.address} · ${share.distanceFromStation}\n")
                    append(share.priceRange)
                    val shortAddr = share.address.substringBefore(",").trim()
                    val link = share.mapUrl ?: "https://map.naver.com/v5/search/${
                        java.net.URLEncoder.encode("$shortAddr ${share.name}", "UTF-8")
                    }"
                    append("\n<${link}|네이버 지도>")

                },
            ),
        )
        add(context("왁뿌볼 점메추 · ${share.mode}"))
    })
}

fun mingleMessage(share: MingleShare): JsonObject = buildJsonObject {
    put("text", "밍글 추첨 당첨: ${share.winner}")
    put("blocks", buildJsonArray {
        add(header("밍글 조 추첨 결과"))
        add(markdownSection("당첨: *${share.winner}*"))
        add(context("참여 팀: ${share.teams.joinToString(", ")} · 왁뿌볼 밍글 추첨"))
    })
}
