package io.portone.wakbbu.repository

import arrow.core.left
import io.kotest.core.spec.style.FreeSpec
import io.kotest.matchers.booleans.shouldBeFalse
import io.kotest.matchers.booleans.shouldBeTrue
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.portone.wakbbu.config.createDslContext
import io.portone.wakbbu.config.createTestDataSource
import io.portone.wakbbu.config.runMigration
import io.portone.wakbbu.domain.DiningMode
import io.portone.wakbbu.domain.FoodCategory
import io.portone.wakbbu.domain.Restaurant
import org.jooq.impl.DSL
import java.util.UUID

class RestaurantRepositoryTest : FreeSpec({
    val dataSource = createTestDataSource()
    val dsl = createDslContext(dataSource)
    val repo = RestaurantRepository(dsl)

    beforeSpec { runMigration(dataSource) }

    beforeEach { dsl.deleteFrom(DSL.table("restaurants")).execute() }

    fun sampleRestaurant(
        id: String = UUID.randomUUID().toString(),
        name: String = "맛집",
        category: FoodCategory = FoodCategory.korean,
        closed: Boolean = false,
        modes: List<DiningMode> = listOf(DiningMode.`dine-in`),
        tags: List<String> = listOf("혼밥", "가성비"),
    ) = Restaurant(
        id = id,
        name = name,
        category = category,
        description = "맛있는 $name",
        address = "서울시 강남구",
        distanceFromStation = "도보 5분",
        priceRange = "8000-12000",
        availableModes = modes,
        tags = tags,
        closed = closed,
    )

    "create and findById" {
        val created = repo.create(sampleRestaurant(id = "test1", name = "테스트식당"))
        created.id shouldBe "test1"
        created.name shouldBe "테스트식당"
        created.tags shouldBe listOf("혼밥", "가성비")

        val found = repo.findById("test1")
        found.shouldNotBeNull()
        found.name shouldBe "테스트식당"
        found.category shouldBe FoodCategory.korean
        found.availableModes shouldBe listOf(DiningMode.`dine-in`)
    }

    "findAll with category filter" {
        repo.create(sampleRestaurant(name = "중식당", category = FoodCategory.chinese))
        repo.create(sampleRestaurant(name = "일식당", category = FoodCategory.japanese))

        val chinese = repo.findAll(category = FoodCategory.chinese)
        chinese.map { it.name } shouldContain "중식당"
        chinese.none { it.category == FoodCategory.japanese }.shouldBeTrue()
    }

    "findAll with mode filter" {
        repo.create(sampleRestaurant(name = "배달식당", modes = listOf(DiningMode.delivery)))
        repo.create(sampleRestaurant(name = "매장식당", modes = listOf(DiningMode.`dine-in`)))

        val deliveryResults = repo.findAll(mode = DiningMode.delivery)
        deliveryResults.map { it.name } shouldContain "배달식당"
    }

    "findAll with search" {
        repo.create(sampleRestaurant(name = "검색용식당"))

        val results = repo.findAll(search = "검색용")
        results.map { it.name } shouldContain "검색용식당"

        val noResults = repo.findAll(search = "존재하지않는식당이름xyz")
        noResults shouldHaveSize 0
    }

    "findRandom returns matching mode" {
        repo.create(sampleRestaurant(name = "랜덤식당", modes = listOf(DiningMode.`dine-in`)))

        val random = repo.findRandom(mode = DiningMode.`dine-in`)
        random.shouldNotBeNull()
        random.availableModes shouldContain DiningMode.`dine-in`
    }

    "findRandom excludes closed restaurants" {
        val closed = repo.create(sampleRestaurant(name = "폐업식당", closed = true, modes = listOf(DiningMode.delivery)))
        repo.create(sampleRestaurant(name = "영업중식당", closed = false, modes = listOf(DiningMode.delivery)))

        repeat(5) {
            val random = repo.findRandom(mode = DiningMode.delivery)
            random.shouldNotBeNull()
            random.id shouldNotBe closed.id
            random.closed.shouldBeFalse()
        }
    }

    "update partial fields" {
        val created = repo.create(sampleRestaurant(name = "수정전"))

        val updated = repo.update(created.id, mapOf("name" to "수정후", "note" to "특이사항")).getOrNull()
        updated.shouldNotBeNull()
        updated.name shouldBe "수정후"
        updated.note shouldBe "특이사항"
        updated.category shouldBe FoodCategory.korean
    }

    "update with unknown field returns UnknownField" {
        val created = repo.create(sampleRestaurant())

        repo.update(created.id, mapOf("bogus" to "x")) shouldBe
            UpdateRestaurantError.UnknownField("bogus").left()
    }

    "update with invalid enum value returns InvalidValue" {
        val created = repo.create(sampleRestaurant())

        repo.update(created.id, mapOf("category" to "nope")) shouldBe
            UpdateRestaurantError.InvalidValue("category").left()
        repo.update(created.id, mapOf("availableModes" to listOf("walk-in"))) shouldBe
            UpdateRestaurantError.InvalidValue("availableModes").left()
    }

    "update nonexistent id returns NotFound" {
        repo.update("nonexistent-id", mapOf("name" to "x")) shouldBe
            UpdateRestaurantError.NotFound.left()
    }

    "delete" {
        val created = repo.create(sampleRestaurant(name = "삭제대상"))

        repo.delete(created.id).shouldBeTrue()
        repo.findById(created.id).shouldBeNull()

        repo.delete("nonexistent-id").shouldBeFalse()
    }
})
