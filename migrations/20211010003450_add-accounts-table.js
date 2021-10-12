exports.up = function (knex) {
  return knex.schema.hasTable("accounts").then(function (exists) {
    if (!exists) {
      return knex.schema.createTable("accounts", function (table) {
        table.string("type", 255).notNullable();
        table.decimal("balance");
        table.string("spot_account_listen_key", 255);
        table.integer("create_order_after");
        table.unique(["type"]);
      });
    }
  });
};

exports.down = function (knex) {};
