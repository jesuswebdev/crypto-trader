const dotenv = require("dotenv");
dotenv.config();

const filterList = (s = "") => s.split(",").filter(v => !!v);

exports.WS_API_URL = process.env.WS_API_URL;
exports.ENVIRONMENT = process.env.NODE_ENV;
exports.QUOTE_ASSET = process.env.QUOTE_ASSET;
exports.DEFAULT_BUY_ORDER_TYPE = process.env.DEFAULT_BUY_ORDER_TYPE ?? "MARKET";
exports.DEFAULT_SELL_ORDER_TYPE =
  process.env.DEFAULT_SELL_ORDER_TYPE ?? "MARKET";
exports.DEFAULT_BUY_AMOUNT = +process.env.DEFAULT_BUY_AMOUNT;
exports.WHITELIST = filterList(process.env.WHITELIST);
exports.BLACKLIST = filterList(process.env.BLACKLIST);
