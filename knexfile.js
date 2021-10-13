const path = require("path");

module.exports = {
  development: {
    client: "sqlite3",
    connection: {
      filename: path.resolve("/data", "./db/dev.sqlite3")
    },
    migrations: {
      tableName: "knex_migrations",
      directory: path.resolve("../", "./migrations")
    },
    useNullAsDefault: true
  },

  production: {
    client: "sqlite3",
    connection: { filename: path.resolve("/data", "./db/db.sqlite3") },
    migrations: {
      tableName: "knex_migrations",
      directory: path.resolve("../", "./migrations")
    },
    useNullAsDefault: true
  }
};
