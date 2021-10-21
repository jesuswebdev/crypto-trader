const ws = require("ws");
const { binance } = require("../utils/http");
const { toSymbolStepPrecision, nz } = require("@crypto-trader/utils");
const {
  QUOTE_ASSET,
  ENVIRONMENT,
  WS_API_URL,
  DEFAULT_BUY_AMOUNT,
  BUY_ORDER_TYPE,
  SELL_ORDER_TYPE,
  WHITELIST,
  BLACKLIST,
  SELL_ORDER_TTL,
  BUY_ORDER_TTL
} = require("@crypto-trader/config");

const MAX_REQUESTS = 48;

function logMessage() {
  console.log(`[${new Date().toISOString()}]`, ...arguments);
}

module.exports = class Observer {
  constructor(db) {
    this.db = db;
    this.client = null;
  }

  async createOrder(signalData) {
    const signalId = signalData._id;
    logMessage(
      `${signalId} | ${String(signalData.type).toUpperCase()} | ${
        signalData.symbol
      } @ ${signalData.price}`
    );

    const [account] = await this.db("accounts")
      .where({ type: ENVIRONMENT })
      .select();

    const enoughBalance =
      signalData.type === "entry"
        ? account?.balance > DEFAULT_BUY_AMOUNT
        : true;

    const whitelisted =
      WHITELIST.length === 0 ||
      WHITELIST.some(item => item === signalData.symbol);

    const blacklisted = BLACKLIST.some(item => item === signalData.symbol);

    if (
      Date.now() < account?.create_order_after ||
      !enoughBalance ||
      !whitelisted ||
      blacklisted
    ) {
      let reason = "10s order limit reached.";
      if (!enoughBalance) reason = "Not enough balance.";
      if (!whitelisted) reason = "Pair not whitelisted.";
      if (blacklisted) reason = "Pair is blacklisted.";
      logMessage(`${signalId} | Unable to continue. Reason: ${reason}`);
      return;
    }

    try {
      const orderType =
        signalData.orderType ??
        (signalData.type === "entry" ? BUY_ORDER_TYPE : SELL_ORDER_TYPE);

      let query = {
        type: orderType,
        symbol: signalData.symbol,
        side: signalData.type === "entry" ? "BUY" : "SELL"
      };

      if (query.side === "BUY" && query.type === "MARKET") {
        query["quoteOrderQty"] = DEFAULT_BUY_AMOUNT;
      }
      if (query.type === "LIMIT") {
        query["timeInForce"] = "GTC";
        query["price"] = signalData.price;
        if (query.side === "BUY") {
          query["quantity"] = toSymbolStepPrecision(
            DEFAULT_BUY_AMOUNT / signalData.price,
            signalData.symbol
          );
        }
      }
      if (query.side === "SELL") {
        const [signal] = await this.db("signals")
          .where({ id: signalId })
          .select();

        let order = await this.getOrderFromDbOrBinance(signal);

        if (order?.status !== "CANCELED" && order?.status !== "FILLED") {
          logMessage(
            `${signalId} | Order (${order.symbol}-${order.orderId}) has not been filled. Cancelling...`
          );
          const cancelQuery = new URLSearchParams({
            symbol: order.symbol,
            orderId: order.orderId
          }).toString();
          await binance.delete(`/api/v3/order?${cancelQuery}`);
          order = await this.getOrderFromDbOrBinance(signal);
        }

        const quantityToSell =
          +nz(order?.executedQty) -
          (signal.symbol.replace(QUOTE_ASSET, "") === order?.commissionAsset
            ? +nz(order?.commissionAmount)
            : 0);

        if (quantityToSell === 0) {
          logMessage(`${signalId} | Nothing to sell.`);
          return;
        }

        query["quantity"] = toSymbolStepPrecision(
          quantityToSell,
          signalData.symbol
        );
      }
      logMessage(
        signalId + " | Attempting to create order: ",
        JSON.stringify(query)
      );
      const searchParams = new URLSearchParams(query).toString();
      const { data, headers } = await binance.post(
        `/api/v3/order?${searchParams}`
      );

      await this.checkHeaders(headers);

      if (!!data?.orderId) {
        logMessage(
          signalId + " | Request completed. Order created: ",
          data.symbol + "-" + data.orderId
        );
        await this.db("signals").insert({
          symbol: signalData.symbol,
          id: signalId,
          orderId: data.orderId,
          type: signalData.type
        });
      }

      if (
        query.type === "LIMIT" &&
        ((query.side === "BUY" && BUY_ORDER_TTL) ||
          (query.side === "SELL" && SELL_ORDER_TTL))
      ) {
        this.setOrderTimeout(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      return;
    }
  }

  async getOrderFromDbOrBinance(signal) {
    if (!signal) {
      throw new Error("Signal is not defined.");
    }

    let order;
    try {
      [order] = await this.db("orders")
        .where({ symbol: signal.symbol })
        .andWhere({ orderId: signal.orderId })
        .select();

      if (!order) {
        throw new Error("Order does not exist in database.");
      }
    } catch (error) {
      console.error(error);
      const query = new URLSearchParams({
        orderId: signal.orderId,
        symbol: signal.symbol
      }).toString();
      try {
        const { data } = await binance.get(`/api/v3/order?${query}`);

        if (data.orderId) {
          order = data;
        }
      } catch (error_2) {
        console.error(error_2);
      }
    }

    return order;
  }

  async checkHeaders(headers) {
    if (Number(headers["x-mbx-order-count-10s"]) >= MAX_REQUESTS) {
      await this.db("accounts")
        .where({ type: ENVIRONMENT })
        .update({ create_order_after: Date.now() + 1e4 });
    }
    return;
  }

  setOrderTimeout(paramOrder) {
    setTimeout(
      async () => {
        let order = await this.getOrderFromDbOrBinance(paramOrder);
        if (order?.status !== "CANCELED" && order?.status !== "FILLED") {
          if (paramOrder.side === "BUY") {
            logMessage(
              `Limit buy order (${order.symbol}-${order.orderId}) has timed out. Cancelling...`
            );
            const cancelQuery = new URLSearchParams({
              symbol: order.symbol,
              orderId: order.orderId
            }).toString();
            await binance.delete(`/api/v3/order?${cancelQuery}`);
          } else {
            logMessage(
              `Limit sell order (${order.symbol}-${order.orderId}) has timed out. Creating new market order instead.`
            );
            const [signal] = this.db("signals")
              .where({ symbol: paramOrder.symbol })
              .andWhere({ orderId: paramOrder.orderId })
              .select();
            await this.createOrder({
              ...signal,
              _id: signal.id,
              orderType: "MARKET"
            });
          }
        }
      },
      paramOrder.side === "BUY" ? BUY_ORDER_TTL : SELL_ORDER_TTL
    );
  }

  async init() {
    try {
      logMessage(
        "Configuration: ",
        JSON.stringify(
          {
            WS_API_URL,
            ENVIRONMENT,
            QUOTE_ASSET,
            DEFAULT_BUY_AMOUNT,
            BUY_ORDER_TYPE,
            SELL_ORDER_TYPE,
            WHITELIST,
            BLACKLIST,
            BUY_ORDER_TTL,
            SELL_ORDER_TTL
          },
          null,
          2
        )
      );
      this.client = new ws(WS_API_URL);

      this.client.on("open", () => {
        logMessage(`Signals Observer | Connection open.`);
      });

      this.client.on("ping", () => {
        this.client.pong();
      });

      this.client.on("message", async data => {
        try {
          const parsedData = JSON.parse(data.toString());
          await this.createOrder(parsedData);
        } catch (error) {
          console.error(error);
          throw error;
        }
      });

      this.client.on("error", () => {
        logMessage(`Signals Observer | ERROR`);
        process.exit();
      });

      this.client.on("close", async () => {
        logMessage(`Signals Observer | Connection closed.`);
        await this.init();
      });
    } catch (error) {
      throw error;
    }
  }
};
