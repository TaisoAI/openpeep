const fs = require("fs");
const http = require("http");
const { PID_PATH, CONFIG_PATH } = require("./paths");
const { isPluginInstalled } = require("./claude-plugin");

function getPort() {
  // Check CLI args first
  const portIdx = process.argv.indexOf("--port");
  if (portIdx !== -1 && process.argv[portIdx + 1]) return parseInt(process.argv[portIdx + 1]);
  // Check config
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    if (config.port) return config.port;
  } catch {}
  return 3000;
}

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

  const port = getPort();
  const req = http.get(`http://localhost:${port}/api/health`, (res) => {
    let data = "";
    res.on("data", (chunk) => data += chunk);
    res.on("end", () => {
      try {
        const health = JSON.parse(data);
        let build;
        try { build = require("../build-info.json"); } catch {}
        const ver = build ? `${health.version} (${build.build})` : health.version;
        console.log(`  ✓ Running on http://localhost:${port} (pid ${pid})`);
        console.log(`  ✓ Version: ${ver}`);
        console.log(`  ✓ Claude Code MCP: ${isPluginInstalled() ? "installed" : "not installed"}`);
      } catch {
        console.log(`  ⚠ Running (pid ${pid}) but health check returned unexpected response`);
      }
    });
  });
  req.on("error", () => {
    console.log(`  ⚠ Process running (pid ${pid}) but not responding on port ${port}`);
  });
  req.end();
}

module.exports = { run };
