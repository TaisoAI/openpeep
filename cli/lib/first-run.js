const fs = require("fs");
const { CONFIG_PATH, VENV_PATH } = require("./paths");

function isFirstRun() {
  return !fs.existsSync(CONFIG_PATH) || !fs.existsSync(VENV_PATH);
}

module.exports = { isFirstRun };
