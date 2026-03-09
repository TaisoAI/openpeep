const fs = require("fs");
const http = require("http");
const { PID_PATH } = require("./paths");
const { isPluginInstalled } = require("./claude-plugin");

function run() {
  if (!fs.existsSync(PID_PATH)) {
    console.log("  OpenPeep is not running.");
    console.log("  Start it with: npx openpeep");
    return;
  }

  const pid = parseInt(fs.readFileSync(PID_PATH, "utf8").trim());
  let running = false;
  try { process.kill(pid, 0); running = true; } catch {}

  if (!running) {
    fs.unlinkSync(PID_PATH);
    console.log("  OpenPeep is not running (stale PID cleaned up).");
    return;
  }

  const req = http.get("http://localhost:3000/api/health", (res) => {
    let data = "";
    res.on("data", (chunk) => data += chunk);
    res.on("end", () => {
      try {
        const health = JSON.parse(data);
        console.log(`  ✓ Running on http://localhost:3000 (pid ${pid})`);
        console.log(`  ✓ Version: ${health.version}`);
        console.log(`  ✓ Claude Code plugin: ${isPluginInstalled() ? "installed" : "not installed"}`);
      } catch {
        console.log(`  ⚠ Running (pid ${pid}) but health check returned unexpected response`);
      }
    });
  });
  req.on("error", () => {
    console.log(`  ⚠ Process running (pid ${pid}) but not responding on port 3000`);
  });
  req.end();
}

module.exports = { run };
