package io.portone.wakbbu.route

import io.kotest.core.spec.style.FreeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import io.portone.wakbbu.config.createDslContext
import io.portone.wakbbu.config.createTestDataSource
import io.portone.wakbbu.config.runMigration
import io.portone.wakbbu.configurePlugins
import io.portone.wakbbu.repository.RestaurantRepository
import io.portone.wakbbu.repository.SmashLogRepository
import io.ktor.server.routing.*

class SmashLogRoutesTest : FreeSpec({

    "POST smash log and GET stats" {
        testApplication {
            application {
                val ds = createTestDataSource()
                runMigration(ds)
                val dsl = createDslContext(ds)
                configurePlugins()
                routing {
                    restaurantRoutes(RestaurantRepository(dsl))
                    smashLogRoutes(SmashLogRepository(dsl))
                }
            }

            val createResp = client.post("/api/restaurants") {
                contentType(ContentType.Application.Json)
                setBody("""{"name":"스매시식당","category":"korean","availableModes":["dine-in"],"tags":[]}""")
            }
            val idRegex = """"id"\s*:\s*"([^"]+)"""".toRegex()
            val restaurantId = idRegex.find(createResp.bodyAsText())!!.groupValues[1]

            val logResp = client.post("/api/smash-logs") {
                contentType(ContentType.Application.Json)
                setBody("""{"restaurantId":"$restaurantId","mode":"dine-in"}""")
            }
            logResp.status shouldBe HttpStatusCode.Created

            val statsResp = client.get("/api/smash-logs/stats")
            statsResp.status shouldBe HttpStatusCode.OK
            statsResp.bodyAsText() shouldContain "totalSmashes"
            statsResp.bodyAsText() shouldContain "스매시식당"
        }
    }
})
