package io.portone.wakbbu.slack

import io.kotest.core.spec.style.FreeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.string.shouldNotContain
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

class SlackMessagesTest :
    FreeSpec({
        val lunch = LunchShare(
            name = "효자동목고기",
            category = "한식",
            mode = "직접방문",
            address = "서울 성동구 연무장5가길 25",
            distanceFromStation = "도보 4분",
            priceRange = "1~2만원",
            mapUrl = "https://map.kakao.com/?q=효자동목고기",
        )

        "점메추 메시지는 알림 텍스트와 3개 블록을 가진다" {
            val message = lunchMessage(lunch)

            message["text"]!!.jsonPrimitive.content shouldBe "오늘 점심은 효자동목고기"
            val blocks = message["blocks"]!!.jsonArray
            blocks.size shouldBe 3
            blocks[0].jsonObject["type"]!!.jsonPrimitive.content shouldBe "header"
            blocks[1].jsonObject["type"]!!.jsonPrimitive.content shouldBe "section"
            blocks[2].jsonObject["type"]!!.jsonPrimitive.content shouldBe "context"
        }

        "본문에 가게 정보와 지도 링크가 들어간다" {
            val body = lunchMessage(lunch)["blocks"]!!.jsonArray[1]
                .jsonObject["text"]!!.jsonObject["text"]!!.jsonPrimitive.content

            body shouldContain "*효자동목고기* · 한식"
            body shouldContain "서울 성동구 연무장5가길 25 · 도보 4분"
            body shouldContain "1~2만원"
            body shouldContain "<https://map.kakao.com/?q=효자동목고기|지도 보기>"
        }

        "지도 링크가 없으면 링크 줄이 빠진다" {
            val body = lunchMessage(lunch.copy(mapUrl = null))["blocks"]!!.jsonArray[1]
                .jsonObject["text"]!!.jsonObject["text"]!!.jsonPrimitive.content

            body shouldNotContain "지도 보기"
        }

        "밍글 메시지는 당첨 팀을 강조하고 참여 팀을 나열한다" {
            val message = mingleMessage(MingleShare(winner = "3조", teams = listOf("1조", "2조", "3조")))

            message["text"]!!.jsonPrimitive.content shouldBe "밍글 추첨 당첨: 3조"
            val blocks = message["blocks"]!!.jsonArray
            blocks[1].jsonObject["text"]!!.jsonObject["text"]!!.jsonPrimitive.content shouldBe "당첨: *3조*"
            blocks[2].jsonObject["elements"]!!.jsonArray[0]
                .jsonObject["text"]!!.jsonPrimitive.content shouldContain "1조, 2조, 3조"
        }
    })
