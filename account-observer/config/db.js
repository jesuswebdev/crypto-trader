"use strict";
const knexfile = require("../../knexfile");
const { ENVIRONMENT } = require("./");

module.exports = async () => {
  try {
    const knex = require("knex")(knexfile[ENVIRONMENT]);
    return knex;
  } catch (error) {
    throw error;
  }
};
