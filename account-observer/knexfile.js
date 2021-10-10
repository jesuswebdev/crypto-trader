const path = require("path");

module.exports = {
  development: {
    client: "sqlite3",
    connection: {
      filename: path.resolve("../", "./dev.sqlite3")
    },
    migrations: {
      tableName: "knex_migrations"
    },
    useNullAsDefault: true
  },

  production: {
    client: "sqlite3",
    connection: { filename: path.resolve("../", "./db.sqlite3") },
    migrations: {
      tableName: "knex_migrations"
    },
    useNullAsDefault: true
  }
};
