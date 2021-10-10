const dotenv = require("dotenv");
dotenv.config();

exports.QUOTE_ASSET = process.env.QUOTE_ASSET;
exports.ENVIRONMENT = process.env.NODE_ENV;
