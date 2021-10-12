exports.up = function (knex) {
  return knex.schema.hasTable("orders").then(function (exists) {
    if (!exists) {
      return knex.schema.createTable("orders", function (table) {
        table.string("symbol", 255).notNullable();
        table.integer("orderId").notNullable();
        table.integer("orderListId");
        table.string("clientOrderId", 255).notNullable();
        table.string("price", 255).notNullable();
        table.string("origQty", 255);
        table.string("executedQty", 255);
        table.string("cummulativeQuoteQty", 255);
        table.string("commissionAmount", 255);
        table.string("commissionAsset", 255);
        table.string("status", 255).notNullable();
        table.string("timeInForce", 255).notNullable();
        table.string("type", 255).notNullable();
        table.string("side", 255).notNullable();
        table.string("stopPrice", 255);
        table.string("icebergQty", 255);
        table.integer("time");
        table.string("origQuoteOrderQty", 255);
        table.integer("eventTime");
        table.integer("transactTime");
        table.timestamps();
        table.unique(["symbol", "orderId"]);
      });
    }
  });
};

exports.down = function (knex) {};
