package io.portone.wakbbu.repository

import io.kotest.core.spec.style.FreeSpec
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import io.portone.wakbbu.config.createDslContext
import io.portone.wakbbu.config.createTestDataSource
import io.portone.wakbbu.config.runMigration
import io.portone.wakbbu.domain.SmashLog
import org.jooq.impl.DSL

class SmashLogRepositoryTest : FreeSpec({
    val dataSource = createTestDataSource()
    runMigration(dataSource)
    val dsl = createDslContext(dataSource)
    val repo = SmashLogRepository(dsl)

    fun insertRestaurant(id: String, name: String) {
        dsl.insertInto(DSL.table("restaurants"))
            .set(DSL.field("id"), id)
            .set(DSL.field("name"), name)
            .set(DSL.field("category"), "korean")
            .set(DSL.field("description"), "")
            .set(DSL.field("address"), "")
            .set(DSL.field("distance_from_station"), "")
            .set(DSL.field("price_range"), "")
            .execute()
    }

    beforeEach {
        dsl.deleteFrom(DSL.table("smash_logs")).execute()
        dsl.deleteFrom(DSL.table("restaurants")).execute()
    }

    "log entry increments totalSmashes" {
        insertRestaurant("r1", "식당1")

        repo.stats().totalSmashes shouldBe 0

        repo.log(SmashLog(id = "s1", restaurantId = "r1", mode = "dine-in"))
        repo.stats().totalSmashes shouldBe 1

        repo.log(SmashLog(id = "s2", restaurantId = "r1", mode = "dine-in"))
        repo.stats().totalSmashes shouldBe 2
    }

    "topRestaurants sorted by count desc and limited to 5" {
        val restaurantIds = (1..7).map { "r$it" }
        restaurantIds.forEachIndexed { index, id ->
            insertRestaurant(id, "식당${ index + 1 }")
        }

        var logId = 0
        restaurantIds.forEachIndexed { index, restaurantId ->
            repeat(index + 1) {
                logId++
                repo.log(SmashLog(id = "s$logId", restaurantId = restaurantId, mode = "dine-in"))
            }
        }

        val stats = repo.stats()
        stats.totalSmashes shouldBe 28
        stats.topRestaurants shouldHaveSize 5

        stats.topRestaurants[0].restaurantId shouldBe "r7"
        stats.topRestaurants[0].name shouldBe "식당7"
        stats.topRestaurants[0].count shouldBe 7

        stats.topRestaurants[1].count shouldBe 6
        stats.topRestaurants[2].count shouldBe 5
        stats.topRestaurants[3].count shouldBe 4
        stats.topRestaurants[4].count shouldBe 3
    }
})
