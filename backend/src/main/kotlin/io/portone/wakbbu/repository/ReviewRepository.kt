package io.portone.wakbbu.repository

import io.portone.wakbbu.domain.Review
import org.jooq.DSLContext
import org.jooq.Record
import org.jooq.impl.DSL

private val REVIEWS = DSL.table("reviews")

private val ID = DSL.field("id", String::class.java)
private val RESTAURANT_ID = DSL.field("restaurant_id", String::class.java)
private val NICKNAME = DSL.field("nickname", String::class.java)
private val CONTENT = DSL.field("content", String::class.java)
private val RATING = DSL.field("rating", Int::class.java)
private val CREATED_AT = DSL.field("created_at", String::class.java)

class ReviewRepository(private val dsl: DSLContext) {

    fun create(review: Review): Review {
        dsl.insertInto(REVIEWS)
            .set(ID, review.id)
            .set(RESTAURANT_ID, review.restaurantId)
            .set(NICKNAME, review.nickname)
            .set(CONTENT, review.content)
            .set(RATING, review.rating)
            .execute()
        return findById(review.id)!!
    }

    fun findByRestaurantId(restaurantId: String): List<Review> =
        dsl.selectFrom(REVIEWS)
            .where(RESTAURANT_ID.eq(restaurantId))
            .fetch()
            .map { it.toReview() }

    fun findById(id: String): Review? =
        dsl.selectFrom(REVIEWS)
            .where(ID.eq(id))
            .fetchOne()
            ?.toReview()

    fun update(id: String, nickname: String, content: String, rating: Int): Review? {
        val updated = dsl.update(REVIEWS)
            .set(NICKNAME, nickname)
            .set(CONTENT, content)
            .set(RATING, rating)
            .where(ID.eq(id))
            .execute()
        return if (updated > 0) findById(id) else null
    }

    fun delete(id: String): Boolean =
        dsl.deleteFrom(REVIEWS).where(ID.eq(id)).execute() > 0
}

private fun Record.toReview() = Review(
    id = get(ID)!!,
    restaurantId = get(RESTAURANT_ID)!!,
    nickname = get(NICKNAME)!!,
    content = get(CONTENT)!!,
    rating = get(RATING)!!,
    createdAt = get(CREATED_AT),
)
