const dotenv = require("dotenv");
const { PAIRS, MILLISECONDS } = require("@crypto-trader/utils");

const filterList = (str = "") => {
  if (!str.length) return [];
  const pairsObject = {};
  for (const pair of PAIRS) {
    pairsObject[pair.symbol] = true;
  }
  return str.split(",").filter(v => !!pairsObject[v]);
};

exports.WS_API_URL = process.env.WS_API_URL;
exports.ENVIRONMENT = process.env.NODE_ENV;
exports.QUOTE_ASSET = process.env.QUOTE_ASSET;
exports.DEFAULT_BUY_ORDER_TYPE = process.env.DEFAULT_BUY_ORDER_TYPE ?? "MARKET";
exports.DEFAULT_SELL_ORDER_TYPE =
  process.env.DEFAULT_SELL_ORDER_TYPE ?? "MARKET";
exports.DEFAULT_BUY_AMOUNT = +process.env.DEFAULT_BUY_AMOUNT;
exports.WHITELIST = filterList(process.env.WHITELIST);
exports.BLACKLIST = filterList(process.env.BLACKLIST);
exports.BUY_ORDER_TTL = +(process.env.BUY_ORDER_TTL ?? 0) * MILLISECONDS.SECOND;
exports.SELL_ORDER_TTL =
  +(process.env.SELL_ORDER_TTL ?? 0) * MILLISECONDS.SECOND;
