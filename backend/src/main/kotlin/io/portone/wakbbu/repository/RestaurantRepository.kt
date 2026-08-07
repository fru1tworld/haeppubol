package io.portone.wakbbu.repository

import arrow.core.Either
import arrow.core.raise.either
import arrow.core.raise.ensure
import arrow.core.raise.ensureNotNull
import io.portone.wakbbu.domain.DiningMode
import io.portone.wakbbu.domain.FoodCategory
import io.portone.wakbbu.domain.Restaurant
import kotlinx.serialization.json.Json
import org.jooq.DSLContext
import org.jooq.Record
import org.jooq.impl.DSL

private val RESTAURANTS = DSL.table("restaurants")

private val ID = DSL.field("id", String::class.java)
private val NAME = DSL.field("name", String::class.java)
private val CATEGORY = DSL.field("category", String::class.java)
private val DESCRIPTION = DSL.field("description", String::class.java)
private val ADDRESS = DSL.field("address", String::class.java)
private val PHONE = DSL.field("phone", String::class.java)
private val HOURS = DSL.field("hours", String::class.java)
private val NOTE = DSL.field("note", String::class.java)
private val CLOSED = DSL.field("closed", Int::class.java)
private val DISTANCE_FROM_STATION = DSL.field("distance_from_station", String::class.java)
private val PRICE_RANGE = DSL.field("price_range", String::class.java)
private val AVAILABLE_MODES = DSL.field("available_modes", String::class.java)
private val TAGS = DSL.field("tags", String::class.java)
private val IMAGE_URL = DSL.field("image_url", String::class.java)
private val MAP_URL = DSL.field("map_url", String::class.java)
private val DELIVERY_APPS = DSL.field("delivery_apps", String::class.java)
private val PASSWORD = DSL.field("password", String::class.java)
private val CREATED_AT = DSL.field("created_at", String::class.java)

private val json = Json { ignoreUnknownKeys = true }

sealed interface UpdateRestaurantError {
    data class UnknownField(val name: String) : UpdateRestaurantError
    data class InvalidValue(val name: String) : UpdateRestaurantError
    data object NotFound : UpdateRestaurantError
    data object WrongPassword : UpdateRestaurantError
}

class RestaurantRepository(private val dsl: DSLContext) {

    fun create(restaurant: Restaurant, password: String): Restaurant {
        dsl.insertInto(RESTAURANTS)
            .set(ID, restaurant.id)
            .set(NAME, restaurant.name)
            .set(CATEGORY, restaurant.category.name)
            .set(DESCRIPTION, restaurant.description)
            .set(ADDRESS, restaurant.address)
            .set(PHONE, restaurant.phone)
            .set(HOURS, restaurant.hours)
            .set(NOTE, restaurant.note)
            .set(CLOSED, if (restaurant.closed) 1 else 0)
            .set(DISTANCE_FROM_STATION, restaurant.distanceFromStation)
            .set(PRICE_RANGE, restaurant.priceRange)
            .set(AVAILABLE_MODES, json.encodeToString(restaurant.availableModes))
            .set(TAGS, json.encodeToString(restaurant.tags))
            .set(IMAGE_URL, restaurant.imageUrl)
            .set(MAP_URL, restaurant.mapUrl)
            .set(DELIVERY_APPS, json.encodeToString(restaurant.deliveryApps))
            .set(PASSWORD, password)
            .execute()
        return findById(restaurant.id)!!
    }

    fun findById(id: String): Restaurant? =
        dsl.selectFrom(RESTAURANTS)
            .where(ID.eq(id))
            .fetchOne()
            ?.toRestaurant()

    fun findAll(
        category: FoodCategory? = null,
        mode: DiningMode? = null,
        search: String? = null,
    ): List<Restaurant> =
        dsl.selectFrom(RESTAURANTS).apply {
            val conditions = buildList {
                category?.let { add(CATEGORY.eq(it.name)) }
                mode?.let { add(AVAILABLE_MODES.like("%${it.name}%")) }
                search?.let { q -> add(NAME.like("%$q%").or(DESCRIPTION.like("%$q%"))) }
            }
            if (conditions.isNotEmpty()) where(DSL.and(conditions))
        }.fetch().map { it.toRestaurant() }

    fun findRandom(mode: DiningMode, category: FoodCategory? = null): Restaurant? =
        dsl.selectFrom(RESTAURANTS).apply {
            val conditions = buildList {
                add(CLOSED.eq(0))
                add(AVAILABLE_MODES.like("%${mode.name}%"))
                category?.let { add(CATEGORY.eq(it.name)) }
            }
            where(DSL.and(conditions))
        }.orderBy(DSL.field("RANDOM()"))
            .limit(1)
            .fetchOne()
            ?.toRestaurant()

    fun verifyPassword(id: String, password: String): UpdateRestaurantError? {
        val stored = dsl.select(PASSWORD).from(RESTAURANTS).where(ID.eq(id)).fetchOne()
            ?: return UpdateRestaurantError.NotFound
        if (stored.get(PASSWORD) != password) return UpdateRestaurantError.WrongPassword
        return null
    }

    fun update(id: String, patch: Map<String, Any?>, password: String): Either<UpdateRestaurantError, Restaurant> = either {
        val pwError = verifyPassword(id, password)
        if (pwError != null) raise(pwError)
        if (patch.isEmpty()) return@either findById(id)!!
        val step = dsl.update(RESTAURANTS)
        var set = step.set(ID, ID) // no-op seed to get UpdateSetMoreStep
        patch.forEach { (key, value) ->
            set = when (key) {
                "name" -> set.set(NAME, value as String)
                "category" -> {
                    val category = FoodCategory.entries.find { it.name == value }
                        ?: raise(UpdateRestaurantError.InvalidValue(key))
                    set.set(CATEGORY, category.name)
                }
                "description" -> set.set(DESCRIPTION, value as String)
                "address" -> set.set(ADDRESS, value as String)
                "phone" -> set.set(PHONE, value as String?)
                "hours" -> set.set(HOURS, value as String?)
                "note" -> set.set(NOTE, value as String?)
                "closed" -> {
                    val closed = when (value) {
                        true, "true" -> 1
                        false, "false" -> 0
                        else -> raise(UpdateRestaurantError.InvalidValue(key))
                    }
                    set.set(CLOSED, closed)
                }
                "distanceFromStation" -> set.set(DISTANCE_FROM_STATION, value as String)
                "priceRange" -> set.set(PRICE_RANGE, value as String)
                "availableModes" -> {
                    val modes = (value as List<*>).map { name ->
                        DiningMode.entries.find { it.name == name }
                            ?: raise(UpdateRestaurantError.InvalidValue(key))
                    }
                    set.set(AVAILABLE_MODES, json.encodeToString(modes))
                }
                "tags" -> set.set(TAGS, json.encodeToString((value as List<*>).map { it as String }))
                "imageUrl" -> set.set(IMAGE_URL, value as String?)
                "mapUrl" -> set.set(MAP_URL, value as String?)
                "deliveryApps" -> set.set(DELIVERY_APPS, json.encodeToString((value as List<*>).map { it as String }))
                else -> raise(UpdateRestaurantError.UnknownField(key))
            }
        }
        val updated = set.where(ID.eq(id)).execute()
        ensure(updated > 0) { UpdateRestaurantError.NotFound }
        findById(id)!!
    }

    fun delete(id: String, password: String): UpdateRestaurantError? {
        val pwError = verifyPassword(id, password)
        if (pwError != null) return pwError
        dsl.deleteFrom(RESTAURANTS).where(ID.eq(id)).execute()
        return null
    }

    fun count(): Int =
        dsl.fetchCount(RESTAURANTS)
}

private fun Record.toRestaurant() = Restaurant(
    id = get(ID)!!,
    name = get(NAME)!!,
    category = FoodCategory.valueOf(get(CATEGORY)!!),
    description = get(DESCRIPTION)!!,
    address = get(ADDRESS)!!,
    phone = get(PHONE),
    hours = get(HOURS),
    note = get(NOTE),
    closed = get(CLOSED) == 1,
    distanceFromStation = get(DISTANCE_FROM_STATION)!!,
    priceRange = get(PRICE_RANGE)!!,
    availableModes = json.decodeFromString<List<DiningMode>>(get(AVAILABLE_MODES)!!),
    tags = json.decodeFromString<List<String>>(get(TAGS)!!),
    imageUrl = get(IMAGE_URL),
    mapUrl = get(MAP_URL),
    deliveryApps = json.decodeFromString<List<String>>(get(DELIVERY_APPS)!!),
    createdAt = get(CREATED_AT),
)
