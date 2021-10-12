const ws = require("ws");
const { binance } = require("../utils/http");
const { parseOrder, parseAccountUpdate } = require("../utils");
const { PAIRS, MILLISECONDS } = require("@crypto-trader/utils");
const { QUOTE_ASSET, ENVIRONMENT } = require("@crypto-trader/config");

module.exports = class Observer {
  constructor(db) {
    this.db = db;
    this.allowedPairs = PAIRS.map(({ symbol }) => symbol);
    this.listenKeyKeepAliveInterval = null;
  }

  startListenKeyKeepAliveInterval() {
    this.listenKeyKeepAliveInterval = setInterval(async () => {
      const [account] = await this.db("accounts")
        .where({ type: ENVIRONMENT })
        .select("spot_account_listen_key");
      await binance.listenKeyKeepAlive(account.spot_account_listen_key);
    }, MILLISECONDS.MINUTE * 30);
  }

  stopListenKeyKeepAliveInterval() {
    clearInterval(this.listenKeyKeepAliveInterval);
  }

  async updateBalance() {
    const balance = await binance.getAccountBalance(QUOTE_ASSET);
    await this.db("accounts")
      .insert({ type: ENVIRONMENT, balance })
      .onConflict(["type"])
      .merge();
  }

  async getListenKey() {
    const [account] = await this.db("accounts")
      .where({ type: ENVIRONMENT })
      .select("spot_account_listen_key");
    let spot_account_listen_key;

    try {
      spot_account_listen_key = await binance.createListenKey();
    } catch (error) {
      console.error(error);
      spot_account_listen_key = await binance.createListenKey();
    }

    if (!spot_account_listen_key) {
      throw new Error("No listen key returned from binance.");
    }

    if (account.spot_account_listen_key !== spot_account_listen_key) {
      console.log("Using new listen key.");
    }

    await this.db("accounts").where({ type: ENVIRONMENT }).update({
      spot_account_listen_key
    });

    this.startListenKeyKeepAliveInterval();

    return spot_account_listen_key;
  }

  async init() {
    try {
      console.log(
        `Observer for spot account started at ${new Date().toUTCString()}.`
      );

      await this.updateBalance();
      let spot_account_listen_key = await this.getListenKey();

      this.client = new ws(
        `wss://stream.binance.com:9443/stream?streams=${spot_account_listen_key}`
      );

      this.client.on("open", () => {
        console.log(
          `${new Date().toISOString()} | Spot Account Observer | Connection open.`
        );
      });

      this.client.on("ping", () => {
        this.client.pong();
      });

      this.client.on("message", async data => {
        try {
          const parsedData = JSON.parse(data);
          const message = parsedData.data;
          if (message.e === "executionReport") {
            const parsedOrder = parseOrder(message);
            const validPair = this.allowedPairs.some(
              v => v === parsedOrder.symbol
            );

            if (parsedOrder.orderId && validPair) {
              try {
                await this.db("orders")
                  .insert(parsedOrder)
                  .onConflict(["symbol", "orderId"])
                  .merge();
              } catch (error) {
                console.error(error);
              }
            }
          }
          if (message.e === "outboundAccountPosition") {
            const update = parseAccountUpdate(message, QUOTE_ASSET);
            if (update) {
              await this.db("accounts")
                .where({ type: ENVIRONMENT })
                .update({ balance: update });
            }
          }
        } catch (error) {
          throw error;
        }
      });

      this.client.on("error", () => {
        console.log(
          `${new Date().toISOString()} | Spot Orders Observer | ERROR`
        );
        process.exit();
      });

      this.client.on("close", async () => {
        console.log(
          `${new Date().toISOString()} | Spot Orders Observer Stream closed.`
        );
        this.stopListenKeyKeepAliveInterval();
        await this.init();
      });
    } catch (error) {
      throw error;
    }
  }
};
