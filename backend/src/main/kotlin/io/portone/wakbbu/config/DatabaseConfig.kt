package io.portone.wakbbu.config

import org.flywaydb.core.Flyway
import org.jooq.DSLContext
import org.jooq.SQLDialect
import org.jooq.impl.DSL
import org.sqlite.SQLiteDataSource
import javax.sql.DataSource
import kotlin.io.path.absolutePathString
import kotlin.io.path.createTempFile

fun createDataSource(url: String = "jdbc:sqlite:./wakbbu.db"): DataSource =
    SQLiteDataSource().apply { this.url = url }

fun createDslContext(dataSource: DataSource): DSLContext =
    DSL.using(dataSource, SQLDialect.SQLITE)

fun runMigration(dataSource: DataSource) {
    Flyway.configure()
        .dataSource(dataSource)
        .locations("classpath:db/migration")
        .load()
        .migrate()
}

// SQLite `:memory:`는 커넥션마다 별도 DB가 되므로 테스트용은 임시 파일 DB를 쓴다
fun createTestDataSource(): DataSource {
    val tmpFile = createTempFile("wakbbu-test-", ".db")
    tmpFile.toFile().deleteOnExit()
    return createDataSource("jdbc:sqlite:${tmpFile.absolutePathString()}")
}
