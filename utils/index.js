const axios = require("axios");
const crypto = require("crypto");
const path = require("path");
const pairs = require(path.resolve(
  __dirname,
  "./",
  `${String(process.env.QUOTE_ASSET).toLowerCase()}_pairs.js`
));

const milliseconds = {
  seconds: 1e3,
  minute: 6e4,
  hour: 36e5,
  day: 36e5 * 24,
  week: 36e5 * 24 * 7
};

const invalidNumber = v =>
  typeof v === "undefined" || v === null || v === Infinity || isNaN(v);

const nz = (v, d) => (invalidNumber(v) ? d ?? 0 : v);

function toFixedPrecision(n, digits = 8) {
  return +Number(n).toPrecision(digits);
}

function getSymbolPrecision(symbol, type) {
  return pairs.find(p => p.symbol === symbol)[type];
}

const getResult = (value, tick) => {
  return Math.trunc(toFixedPrecision(value / tick)) / Math.ceil(1 / tick);
};

function toSymbolPrecision(value, symbol) {
  const tick = getSymbolPrecision(symbol, "priceTickSize");
  return getResult(value, tick);
}

function toSymbolStepPrecision(value, symbol) {
  const tick = getSymbolPrecision(symbol, "stepSize");
  return getResult(value, tick);
}

function getBinanceInstance(env) {
  if (!env.BINANCE_API_URL) {
    throw new Error("Binance API URL is not set.");
  }
  if (!env.BINANCE_API_KEY) {
    throw new Error("Binance API Key is not set.");
  }
  if (!env.BINANCE_API_SECRET) {
    throw new Error("Binance API Secret is not set.");
  }

  const binance = axios.create({
    baseURL: env.BINANCE_API_URL,
    headers: { "X-MBX-APIKEY": env.BINANCE_API_KEY }
  });

  const getSignature = query => {
    return crypto
      .createHmac("sha256", env.BINANCE_API_SECRET)
      .update(query)
      .digest("hex");
  };

  const secureEndpoints = [
    "/api/v3/order",
    "/api/v3/allOrders",
    "/api/v3/account",
    "/sapi/v1/asset/assetDetail"
  ];

  binance.interceptors.request.use(
    config => {
      const [base, query] = config.url.split("?");
      const timestamp = Date.now();
      const requiresSignature = secureEndpoints.some(
        endpoint => endpoint === base
      );
      if (requiresSignature) {
        const newQuery = `timestamp=${timestamp}&recvWindow=15000${
          query ? `&${query}` : ""
        }`;
        config.url = `${base}?${newQuery}&signature=${getSignature(newQuery)}`;
      }
      return config;
    },
    error => Promise.reject(error)
  );

  return binance;
}

module.exports = {
  pairs,
  milliseconds,
  nz,
  toSymbolPrecision,
  toSymbolStepPrecision,
  getBinanceInstance
};
