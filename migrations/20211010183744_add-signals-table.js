exports.up = function (knex) {
  return knex.schema.hasTable("signals").then(function (exists) {
    if (!exists) {
      return knex.schema.createTable("signals", function (table) {
        table.string("id", 255).notNullable();
        table.integer("orderId");
        table.string("symbol", 255).notNullable();
        table.string("type");
      });
    }
  });
};

exports.down = function (knex) {};
