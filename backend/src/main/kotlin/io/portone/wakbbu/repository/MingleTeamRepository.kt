package io.portone.wakbbu.repository

import org.jooq.DSLContext
import org.jooq.impl.DSL.field
import org.jooq.impl.DSL.table

class MingleTeamRepository(private val dsl: DSLContext) {

    private val t = table("mingle_teams")

    fun findAll(): List<String> =
        dsl.select(field("name", String::class.java))
            .from(t)
            .orderBy(field("id"))
            .fetch()
            .map { it.get(field("name", String::class.java))!! }

    fun add(name: String) {
        dsl.insertInto(t)
            .set(field("name"), name)
            .onConflictDoNothing()
            .execute()
    }

    fun remove(name: String) {
        dsl.deleteFrom(t)
            .where(field("name").eq(name))
            .execute()
    }

    fun replaceAll(names: List<String>) {
        dsl.transaction { cfg ->
            val tx = cfg.dsl()
            tx.deleteFrom(t).execute()
            names.forEach { name ->
                tx.insertInto(t)
                    .set(field("name"), name)
                    .execute()
            }
        }
    }
}
