# Crypto Trader

Crypto trader client for [jjscryptosignals.com](https://jjscryptosignals.com). This tool will trade on your behalf on Binance based on the signals received.

## Requirements

[Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) installed, a [Binance](https://accounts.binance.com/en/register?ref=41178621) account and [API Key/Secret](https://www.binance.com/en/support/faq/360002502072) with Spot Trading enabled.

## Usage

Clone the repository or download the source code.

Create an `.env` file in the root folder with the following variables:

```
WS_API_URL=
QUOTE_ASSET=
BUY_ORDER_TYPE=
SELL_ORDER_TYPE=
DEFAULT_BUY_AMOUNT=
BINANCE_API_KEY=
BINANCE_API_SECRET=
BUY_ORDER_TTL=
SELL_ORDER_TTL=
WHITELIST=
BLACKLIST=
```

**`WS_API_URL`**: The signals source. Can be one of the following:

- `wss://ws.jjscryptosignals.com`: Trend signals with `BTC` as quote asset, on the 1D timeframe. Check the [Telegram Channel](https://t.me/jjscryptosignals) for previous signals.
- `wss://ws.jjscryptosignals.com/v1/`: Bottom detector signals (former BD Signals) with `BUSD` as quote asset, on the 1H timeframe. Check the [Telegram Channel](https://t.me/jjscryptosignals3) for previous signals.

**`QUOTE_ASSET`**: Must be set based on the `WS_API_URL` chosen.

**`BUY_ORDER_TYPE`**: `LIMIT` or `MARKET`. Defaults to `MARKET`.

**`SELL_ORDER_TYPE`**: `LIMIT` or `MARKET`. Defaults to `MARKET`.

**`DEFAULT_BUY_AMOUNT`**: How much of `QUOTE_ASSET` to use when placing a buy order. This value must be greater than [the _Minimum Order Size_ specified here](https://www.binance.com/en/trade-rule).

**`BINANCE_API_KEY`**: Your Binance API Key.

**`BINANCE_API_SECRET`**: Your Binance API Secret.

**`BUY_ORDER_TTL`**: Time in seconds after which the order will be canceled if it has not been filled. Optional. For `LIMIT` orders only.

**`SELL_ORDER_TTL`**: Time in seconds after which the order will be canceled if it has not been filled. A sell `MARKET` order will be placed afterwards. Optional. For `LIMIT` orders only.

**`WHITELIST`**: Comma separated pairs, e.g. `BTCBUSD,ETHBUSD`. If set, only signals whose pair exists in this list will be executed. Optional.

**`BLACKLIST`**: Comma separated pairs, e.g. `BTCBUSD,ETHBUSD`. If set, signals whose pair exists in this list will be ignored. Optional.

### start

To start the client, open a terminal in the root folder of the project and run:

`docker-compose up --build -d`

### stop

To stop the client, open a terminal in the root folder of the project and run:

`docker-compose down`
