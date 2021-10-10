"use strict";
const knexfile = require("../../knexfile");
const { ENVIRONMENT } = require("./");

module.exports = () => require("knex")(knexfile[ENVIRONMENT]);
