package io.portone.wakbbu.repository

import io.portone.wakbbu.domain.SmashLog
import io.portone.wakbbu.domain.SmashStats
import io.portone.wakbbu.domain.TopRestaurant
import org.jooq.DSLContext
import org.jooq.impl.DSL.count
import org.jooq.impl.DSL.field
import org.jooq.impl.DSL.table

class SmashLogRepository(private val dsl: DSLContext) {

    private val t = table("smash_logs")

    fun log(entry: SmashLog) {
        dsl.insertInto(t)
            .set(field("id"), entry.id)
            .set(field("restaurant_id"), entry.restaurantId)
            .set(field("mode"), entry.mode)
            .execute()
    }

    fun stats(): SmashStats {
        val total = dsl.fetchCount(t)
        val restaurantIdField = field("smash_logs.restaurant_id", String::class.java)
        val nameField = field("restaurants.name", String::class.java)
        val cntField = count().`as`("cnt")
        val top = dsl.select(restaurantIdField, nameField, cntField)
            .from(t)
            .join(table("restaurants")).on(field("smash_logs.restaurant_id").eq(field("restaurants.id")))
            .groupBy(restaurantIdField, nameField)
            .orderBy(cntField.desc())
            .limit(5)
            .fetch()
            .map { rec ->
                TopRestaurant(
                    restaurantId = rec.get(restaurantIdField)!!,
                    name = rec.get(nameField)!!,
                    count = rec.get(cntField)!!,
                )
            }
        return SmashStats(totalSmashes = total, topRestaurants = top)
    }
}
