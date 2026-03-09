const fs = require("fs");
const { PID_PATH } = require("./paths");

function run() {
  if (!fs.existsSync(PID_PATH)) {
    console.log("  OpenPeep is not running.");
    return;
  }
  const pid = parseInt(fs.readFileSync(PID_PATH, "utf8").trim());
  try {
    process.kill(pid, "SIGTERM");
    fs.unlinkSync(PID_PATH);
    console.log("  ✓ Stopped");
  } catch {
    fs.unlinkSync(PID_PATH);
    console.log("  ✓ Cleaned up stale PID file");
  }
}

module.exports = { run };
