"use strict";
const knexfile = require("../../knexfile");
const { ENVIRONMENT } = require("./index");

module.exports = () => require("knex")(knexfile[ENVIRONMENT]);
