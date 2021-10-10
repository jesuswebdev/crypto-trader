exports.up = function (knex) {
  return knex.schema.hasTable("signals").then(function (exists) {
    if (!exists) {
      return knex.schema.createTable("signals", function (table) {
        table.string("id", 255);
        table.integer("orderId");
        table.string("symbol", 255).notNullable();
      });
    }
  });
};

exports.down = function (knex) {};
