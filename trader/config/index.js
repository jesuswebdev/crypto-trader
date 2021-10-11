const dotenv = require("dotenv");
dotenv.config();
const { PAIRS } = require("@crypto-trader/utils");

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
