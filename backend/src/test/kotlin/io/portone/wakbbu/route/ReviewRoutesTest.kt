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
import io.portone.wakbbu.repository.ReviewRepository
import io.ktor.server.routing.*

class ReviewRoutesTest : FreeSpec({

    "POST and GET reviews for a restaurant" {
        testApplication {
            application {
                val ds = createTestDataSource()
                runMigration(ds)
                val dsl = createDslContext(ds)
                configurePlugins()
                routing {
                    restaurantRoutes(RestaurantRepository(dsl))
                    reviewRoutes(ReviewRepository(dsl))
                }
            }

            val createResp = client.post("/api/restaurants") {
                contentType(ContentType.Application.Json)
                setBody("""{"name":"리뷰식당","category":"korean","availableModes":["dine-in"],"tags":[]}""")
            }
            val idRegex = """"id"\s*:\s*"([^"]+)"""".toRegex()
            val restaurantId = idRegex.find(createResp.bodyAsText())!!.groupValues[1]

            val reviewResp = client.post("/api/restaurants/$restaurantId/reviews") {
                contentType(ContentType.Application.Json)
                setBody("""{"nickname":"테스터","content":"맛있어요","rating":5}""")
            }
            reviewResp.status shouldBe HttpStatusCode.Created
            reviewResp.bodyAsText() shouldContain "테스터"

            val listResp = client.get("/api/restaurants/$restaurantId/reviews")
            listResp.status shouldBe HttpStatusCode.OK
            listResp.bodyAsText() shouldContain "맛있어요"
        }
    }

    "PUT and DELETE a review" {
        testApplication {
            application {
                val ds = createTestDataSource()
                runMigration(ds)
                val dsl = createDslContext(ds)
                configurePlugins()
                routing {
                    restaurantRoutes(RestaurantRepository(dsl))
                    reviewRoutes(ReviewRepository(dsl))
                }
            }

            val createResp = client.post("/api/restaurants") {
                contentType(ContentType.Application.Json)
                setBody("""{"name":"리뷰식당","category":"korean","availableModes":["dine-in"],"tags":[]}""")
            }
            val idRegex = """"id"\s*:\s*"([^"]+)"""".toRegex()
            val restaurantId = idRegex.find(createResp.bodyAsText())!!.groupValues[1]

            val reviewResp = client.post("/api/restaurants/$restaurantId/reviews") {
                contentType(ContentType.Application.Json)
                setBody("""{"nickname":"테스터","content":"맛있어요","rating":5}""")
            }
            val reviewId = idRegex.find(reviewResp.bodyAsText())!!.groupValues[1]

            val putResp = client.put("/api/restaurants/$restaurantId/reviews/$reviewId") {
                contentType(ContentType.Application.Json)
                setBody("""{"nickname":"테스터","content":"수정된 리뷰","rating":3}""")
            }
            putResp.status shouldBe HttpStatusCode.OK
            putResp.bodyAsText() shouldContain "수정된 리뷰"

            val deleteResp = client.delete("/api/restaurants/$restaurantId/reviews/$reviewId")
            deleteResp.status shouldBe HttpStatusCode.NoContent

            val getResp = client.get("/api/restaurants/$restaurantId/reviews/$reviewId")
            getResp.status shouldBe HttpStatusCode.NotFound
        }
    }

    "POST review with invalid rating returns 400" {
        testApplication {
            application {
                val ds = createTestDataSource()
                runMigration(ds)
                val dsl = createDslContext(ds)
                configurePlugins()
                routing {
                    restaurantRoutes(RestaurantRepository(dsl))
                    reviewRoutes(ReviewRepository(dsl))
                }
            }

            val response = client.post("/api/restaurants/r1/reviews") {
                contentType(ContentType.Application.Json)
                setBody("""{"nickname":"테스터","content":"x","rating":6}""")
            }
            response.status shouldBe HttpStatusCode.BadRequest
        }
    }
})
