const ws = require("ws");
const { binance } = require("../utils/http");
const { pairs, toSymbolStepPrecision, nz } = require("@crypto-trader/utils");
const {
  QUOTE_ASSET,
  ENVIRONMENT,
  WS_API_URL,
  DEFAULT_BUY_AMOUNT,
  DEFAULT_BUY_ORDER_TYPE,
  DEFAULT_SELL_ORDER_TYPE,
  WHITELIST,
  BLACKLIST
} = require("@crypto-trader/config");

const MAX_REQUESTS = 48;

module.exports = class Observer {
  constructor(db) {
    this.db = db;
    this.allowed_pairs = pairs.map(v => v.symbol);
    this.client = new ws(WS_API_URL);
  }

  async createOrder(signalData) {
    const signalId = signalData._id;

    const [account] = await this.db("accounts")
      .where({ type: ENVIRONMENT })
      .select();

    const [signal] = await this.db("signals").where({ id: signalId }).select();

    const notEnoughBalance =
      account?.balance <= DEFAULT_BUY_AMOUNT && signalData.type === "entry";
    const whitelisted =
      WHITELIST.length === 0 ||
      (WHITELIST.length > 0 && WHITELIST.some(s => s === signalData.symbol));
    const blacklisted =
      BLACKLIST.length > 0 && BLACKLIST.some(s => s === signalData.symbol);
    const doesNotHaveBuyOrder = signalData.type === "exit" && !signal?.orderId;
    if (
      Date.now() < account?.create_order_after ||
      notEnoughBalance ||
      !whitelisted ||
      blacklisted ||
      doesNotHaveBuyOrder
    ) {
      return;
    }

    try {
      const orderType =
        signalData.orderType ??
        (signalData.type === "entry"
          ? DEFAULT_BUY_ORDER_TYPE
          : DEFAULT_SELL_ORDER_TYPE);

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
        let buy_order = await this.getOrderFromDbOrBinance(signal);
        if (
          buy_order?.status !== "CANCELED" &&
          buy_order?.status !== "FILLED"
        ) {
          const cancel_query = new URLSearchParams({
            symbol: buy_order.symbol,
            orderId: buy_order.orderId
          }).toString();
          await binance.delete(`/api/v3/order?${cancel_query}`);
          buy_order = await this.getOrderFromDbOrBinance(signal);
        }

        const quantity_to_sell =
          +nz(buy_order?.executedQty) -
          (signal.symbol.replace(QUOTE_ASSET, "") === buy_order?.commissionAsset
            ? +nz(buy_order?.commissionAmount)
            : 0);

        if (quantity_to_sell === 0) {
          return;
        }

        query["quantity"] = toSymbolStepPrecision(
          quantity_to_sell,
          signalData.symbol
        );
      }
      const searchParams = new URLSearchParams(query).toString();
      const { data, headers } = await binance.post(
        `/api/v3/order?${searchParams}`
      );

      await this.checkHeaders(headers);

      if (!!data?.orderId && query.side === "BUY") {
        await this.db("signals").insert({
          symbol: signalData.symbol,
          id: signalId,
          orderId: data.orderId
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      return;
    }
  }

  async getOrderFromDbOrBinance(signal) {
    if (!signal) {
      throw new Error("Order is not defined.");
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

  async init() {
    try {
      console.log(
        `Observer for signals started at ${new Date().toUTCString()}.`
      );

      this.client.on("open", () => {
        console.log(
          `${new Date().toISOString()} | Signals Observer | Connection open.`
        );
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
        console.log(`${new Date().toISOString()} | Signals Observer | ERROR`);
        process.exit();
      });

      this.client.on("close", async () => {
        console.log(
          `${new Date().toISOString()} | Signals Observer Stream closed.`
        );
        await this.init();
      });
    } catch (error) {
      throw error;
    }
  }
};
