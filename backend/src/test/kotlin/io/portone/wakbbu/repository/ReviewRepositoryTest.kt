package io.portone.wakbbu.repository

import io.kotest.core.spec.style.FreeSpec
import io.kotest.matchers.booleans.shouldBeFalse
import io.kotest.matchers.booleans.shouldBeTrue
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.portone.wakbbu.config.createDslContext
import io.portone.wakbbu.config.createTestDataSource
import io.portone.wakbbu.config.runMigration
import io.portone.wakbbu.domain.Review
import org.jooq.impl.DSL

class ReviewRepositoryTest : FreeSpec({
    val dataSource = createTestDataSource()
    val dsl = createDslContext(dataSource)
    val repo = ReviewRepository(dsl)

    beforeSpec { runMigration(dataSource) }

    beforeEach { dsl.deleteFrom(DSL.table("reviews")).execute() }

    fun sampleReview(id: String = "rev1") = Review(
        id = id,
        restaurantId = "r1",
        nickname = "홍길동",
        content = "맛있어요!",
        rating = 5,
    )

    "create review and findByRestaurantId returns it" {
        val created = repo.create(sampleReview())
        created.id shouldBe "rev1"
        created.restaurantId shouldBe "r1"
        created.nickname shouldBe "홍길동"
        created.content shouldBe "맛있어요!"
        created.rating shouldBe 5
        created.createdAt shouldNotBe null

        val found = repo.findByRestaurantId("r1")
        found shouldHaveSize 1
        found[0].id shouldBe "rev1"
    }

    "findByRestaurantId returns empty for unknown id" {
        val found = repo.findByRestaurantId("unknown-restaurant-id")
        found.shouldBeEmpty()
    }

    "findById returns review or null" {
        repo.create(sampleReview())

        val found = repo.findById("rev1")
        found.shouldNotBeNull()
        found.nickname shouldBe "홍길동"

        repo.findById("nonexistent").shouldBeNull()
    }

    "update replaces nickname, content, rating" {
        repo.create(sampleReview())

        val updated = repo.update("rev1", nickname = "김철수", content = "별로예요", rating = 2)
        updated.shouldNotBeNull()
        updated.nickname shouldBe "김철수"
        updated.content shouldBe "별로예요"
        updated.rating shouldBe 2

        repo.update("nonexistent", nickname = "x", content = "y", rating = 1).shouldBeNull()
    }

    "delete removes review" {
        repo.create(sampleReview())

        repo.delete("rev1").shouldBeTrue()
        repo.findById("rev1").shouldBeNull()

        repo.delete("nonexistent").shouldBeFalse()
    }
})
