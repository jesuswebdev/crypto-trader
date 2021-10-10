const { getBinanceInstance } = require("@crypto-trader/utils");

exports.binance = getBinanceInstance(process.env);
