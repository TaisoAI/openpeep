async function run() {
  const stop = require("./stop");
  stop.run();
  await new Promise((r) => setTimeout(r, 1000));
  const start = require("./start");
  await start.run();
}

module.exports = { run };
