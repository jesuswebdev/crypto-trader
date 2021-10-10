const startDb = require("./config/db");
const Observer = require("./src/observer");

const start = async () => {
  try {
    const db = startDb();
    await new Observer(db).init();
  } catch (error) {
    console.error(error);
    process.exit();
  }
};

start();
