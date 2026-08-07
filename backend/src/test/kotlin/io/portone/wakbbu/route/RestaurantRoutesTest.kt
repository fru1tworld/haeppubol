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
import io.ktor.server.routing.*

class RestaurantRoutesTest : FreeSpec({

    "POST /api/restaurants creates a restaurant" {
        testApplication {
            application {
                val ds = createTestDataSource()
                runMigration(ds)
                val dsl = createDslContext(ds)
                configurePlugins()
                routing { restaurantRoutes(RestaurantRepository(dsl)) }
            }
            val response = client.post("/api/restaurants") {
                contentType(ContentType.Application.Json)
                setBody("""{"name":"테스트식당","category":"korean","description":"맛있는 식당","address":"성수동","distanceFromStation":"5분","priceRange":"만원","availableModes":["dine-in"],"tags":["혼밥"],"password":"1234"}""")
            }
            response.status shouldBe HttpStatusCode.Created
            response.bodyAsText() shouldContain "테스트식당"
        }
    }

    "GET /api/restaurants returns list" {
        testApplication {
            application {
                val ds = createTestDataSource()
                runMigration(ds)
                val dsl = createDslContext(ds)
                configurePlugins()
                routing { restaurantRoutes(RestaurantRepository(dsl)) }
            }
            client.post("/api/restaurants") {
                contentType(ContentType.Application.Json)
                setBody("""{"name":"식당A","category":"korean","availableModes":["dine-in"],"tags":[],"password":"1234"}""")
            }
            val response = client.get("/api/restaurants")
            response.status shouldBe HttpStatusCode.OK
            response.bodyAsText() shouldContain "식당A"
        }
    }

    "GET /api/restaurants/random with mode filter" {
        testApplication {
            application {
                val ds = createTestDataSource()
                runMigration(ds)
                val dsl = createDslContext(ds)
                configurePlugins()
                routing { restaurantRoutes(RestaurantRepository(dsl)) }
            }
            client.post("/api/restaurants") {
                contentType(ContentType.Application.Json)
                setBody("""{"name":"랜덤식당","category":"korean","availableModes":["dine-in"],"tags":[],"password":"1234"}""")
            }
            val response = client.get("/api/restaurants/random?mode=dine-in")
            response.status shouldBe HttpStatusCode.OK
            response.bodyAsText() shouldContain "랜덤식당"
        }
    }

    "GET /api/restaurants/{id} returns 404 for unknown" {
        testApplication {
            application {
                val ds = createTestDataSource()
                runMigration(ds)
                val dsl = createDslContext(ds)
                configurePlugins()
                routing { restaurantRoutes(RestaurantRepository(dsl)) }
            }
            val response = client.get("/api/restaurants/nonexistent")
            response.status shouldBe HttpStatusCode.NotFound
        }
    }

    "PUT /api/restaurants/{id} updates fields" {
        testApplication {
            application {
                val ds = createTestDataSource()
                runMigration(ds)
                val dsl = createDslContext(ds)
                configurePlugins()
                routing { restaurantRoutes(RestaurantRepository(dsl)) }
            }
            val createResp = client.post("/api/restaurants") {
                contentType(ContentType.Application.Json)
                setBody("""{"name":"원래이름","category":"korean","availableModes":["dine-in"],"tags":[],"password":"1234"}""")
            }
            val body = createResp.bodyAsText()
            val idRegex = """"id"\s*:\s*"([^"]+)"""".toRegex()
            val id = idRegex.find(body)!!.groupValues[1]

            val updateResp = client.put("/api/restaurants/$id") {
                contentType(ContentType.Application.Json)
                setBody("""{"password":"1234","patch":{"name":"바뀐이름"}}""")
            }
            updateResp.status shouldBe HttpStatusCode.OK
            updateResp.bodyAsText() shouldContain "바뀐이름"
        }
    }

    "DELETE /api/restaurants/{id} returns 204" {
        testApplication {
            application {
                val ds = createTestDataSource()
                runMigration(ds)
                val dsl = createDslContext(ds)
                configurePlugins()
                routing { restaurantRoutes(RestaurantRepository(dsl)) }
            }
            val createResp = client.post("/api/restaurants") {
                contentType(ContentType.Application.Json)
                setBody("""{"name":"삭제식당","category":"korean","availableModes":[],"tags":[],"password":"1234"}""")
            }
            val body = createResp.bodyAsText()
            val idRegex = """"id"\s*:\s*"([^"]+)"""".toRegex()
            val id = idRegex.find(body)!!.groupValues[1]

            val deleteResp = client.delete("/api/restaurants/$id") {
                contentType(ContentType.Application.Json)
                setBody("""{"password":"1234"}""")
            }
            deleteResp.status shouldBe HttpStatusCode.NoContent
        }
    }

    "GET /api/restaurants/random with invalid mode returns 400" {
        testApplication {
            application {
                val ds = createTestDataSource()
                runMigration(ds)
                val dsl = createDslContext(ds)
                configurePlugins()
                routing { restaurantRoutes(RestaurantRepository(dsl)) }
            }
            val missingMode = client.get("/api/restaurants/random")
            missingMode.status shouldBe HttpStatusCode.BadRequest

            val invalidMode = client.get("/api/restaurants/random?mode=walk-in")
            invalidMode.status shouldBe HttpStatusCode.BadRequest
        }
    }

    "PUT /api/restaurants/{id} with unknown field returns 400" {
        testApplication {
            application {
                val ds = createTestDataSource()
                runMigration(ds)
                val dsl = createDslContext(ds)
                configurePlugins()
                routing { restaurantRoutes(RestaurantRepository(dsl)) }
            }
            val createResp = client.post("/api/restaurants") {
                contentType(ContentType.Application.Json)
                setBody("""{"name":"패치식당","category":"korean","availableModes":[],"tags":[],"password":"1234"}""")
            }
            val idRegex = """"id"\s*:\s*"([^"]+)"""".toRegex()
            val id = idRegex.find(createResp.bodyAsText())!!.groupValues[1]

            val response = client.put("/api/restaurants/$id") {
                contentType(ContentType.Application.Json)
                setBody("""{"password":"1234","patch":{"bogus":"x"}}""")
            }
            response.status shouldBe HttpStatusCode.BadRequest
            response.bodyAsText() shouldContain "unknown field"
        }
    }
})
