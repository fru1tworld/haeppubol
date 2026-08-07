package io.portone.wakbbu.repository

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import org.jooq.DSLContext
import org.jooq.Record
import org.jooq.impl.DSL.field
import org.jooq.impl.DSL.table

@Serializable
data class CrewBall(
    val id: String,
    val name: String,
    val author: String,
    val items: List<String>,
    val shellColor: String? = null,
    val coreColor: String? = null,
    val tagline: String? = null,
    val photo: String? = null,
    val background: String? = null,
    val sound: String? = null,
    val healMode: Boolean = false,
    val createdAt: String,
)

class CrewBallRepository(private val dsl: DSLContext) {

    private val t = table("crew_balls")
    private val json = Json { ignoreUnknownKeys = true }

    fun findAll(): List<CrewBall> =
        dsl.selectFrom(t)
            .orderBy(field("created_at").desc())
            .fetch()
            .map { it.toCrewBall() }

    fun findById(id: String): CrewBall? =
        dsl.selectFrom(t)
            .where(field("id").eq(id))
            .fetchOne()
            ?.toCrewBall()

    fun create(ball: CrewBall) {
        dsl.insertInto(t)
            .set(field("id"), ball.id)
            .set(field("name"), ball.name)
            .set(field("author"), ball.author)
            .set(field("items"), json.encodeToString(ball.items))
            .set(field("shell_color"), ball.shellColor)
            .set(field("core_color"), ball.coreColor)
            .set(field("tagline"), ball.tagline)
            .set(field("photo"), ball.photo)
            .set(field("background"), ball.background)
            .set(field("sound"), ball.sound)
            .set(field("heal_mode"), if (ball.healMode) 1 else 0)
            .set(field("created_at"), ball.createdAt)
            .execute()
    }

    fun delete(id: String) {
        dsl.deleteFrom(t)
            .where(field("id").eq(id))
            .execute()
    }

    private fun Record.toCrewBall(): CrewBall {
        val itemsJson = get(field("items", String::class.java)) ?: "[]"
        return CrewBall(
            id = get(field("id", String::class.java))!!,
            name = get(field("name", String::class.java))!!,
            author = get(field("author", String::class.java))!!,
            items = json.decodeFromString(itemsJson),
            shellColor = get(field("shell_color", String::class.java)),
            coreColor = get(field("core_color", String::class.java)),
            tagline = get(field("tagline", String::class.java)),
            photo = get(field("photo", String::class.java)),
            background = get(field("background", String::class.java)),
            sound = get(field("sound", String::class.java)),
            healMode = (get(field("heal_mode", Int::class.java)) ?: 0) != 0,
            createdAt = get(field("created_at", String::class.java))!!,
        )
    }
}
