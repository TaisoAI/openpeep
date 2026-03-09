const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  OPENPEEP_HOME, CONFIG_PATH, VENV_PATH, PID_PATH,
  PKG_PEEPS, PKG_REQUIREMENTS,
} = require("./paths");
const { checkPython, createVenv, installDeps } = require("./setup-python");
const { isPluginInstalled, installClaudePlugin } = require("./claude-plugin");

const FIX = process.argv.includes("--fix");

let issues = 0;

function pass(msg) { console.log(`  ✓ ${msg}`); }
function fail(msg, fix) {
  issues++;
  console.log(`  ✗ ${msg}`);
  if (fix) console.log(`    → ${fix}`);
}

async function run() {
  console.log("");
  console.log("  OpenPeep Doctor v0.1.0");
  console.log("  ─────────────────────────────────────");
  console.log("");

  // --- Runtime ---
  console.log("  Runtime");
  const nodeVersion = process.versions.node;
  const nodeMajor = parseInt(nodeVersion.split(".")[0]);
  if (nodeMajor >= 20) pass(`Node.js ${nodeVersion}`);
  else fail(`Node.js ${nodeVersion} (need 20+)`, "Update Node.js: https://nodejs.org");

  const python = checkPython();
  if (python) pass(python.version);
  else fail("Python 3.11+ not found", "Install from https://python.org");

  console.log("");

  // --- Environment ---
  console.log("  Environment");
  if (fs.existsSync(VENV_PATH)) {
    const pythonBin = path.join(VENV_PATH, "bin", "python");
    try {
      require("child_process").execFileSync(pythonBin, ["--version"], { encoding: "utf8" });
      pass(`Venv: ${VENV_PATH}`);
    } catch {
      fail("Venv exists but Python binary broken", FIX ? "Recreating..." : "Run: openpeep doctor --fix");
      if (FIX) {
        fs.rmSync(VENV_PATH, { recursive: true, force: true });
        if (python) { createVenv(python.command); installDeps(); pass("Venv recreated"); }
      }
    }
  } else {
    fail("No Python venv found", FIX ? "Creating..." : "Run: openpeep doctor --fix");
    if (FIX && python) { createVenv(python.command); installDeps(); pass("Venv created"); }
  }

  if (fs.existsSync(CONFIG_PATH)) pass(`Config: ${CONFIG_PATH}`);
  else fail("No config file", "Run: npx openpeep (wizard will create it)");

  // Check port
  const { isRunning } = require("./start");
  await new Promise((resolve) => {
    if (isRunning()) {
      pass("Port 3000: in use by OpenPeep");
      resolve();
    } else {
      const server = require("net").createServer();
      server.once("error", () => { fail("Port 3000: in use by another process"); resolve(); });
      server.once("listening", () => { server.close(); pass("Port 3000: available"); resolve(); });
      server.listen(3000);
    }
  });

  console.log("");

  // --- Peeps ---
  console.log("  Peeps");
  if (fs.existsSync(PKG_PEEPS)) {
    const peepDirs = fs.readdirSync(PKG_PEEPS).filter((d) =>
      fs.statSync(path.join(PKG_PEEPS, d)).isDirectory()
    );
    let valid = 0;
    for (const dir of peepDirs) {
      const peepJson = path.join(PKG_PEEPS, dir, "peep.json");
      if (fs.existsSync(peepJson)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(peepJson, "utf8"));
          if (!manifest.id || !manifest.matches) {
            fail(`Peep "${dir}" — invalid peep.json (missing id or matches)`);
          } else {
            valid++;
          }
        } catch {
          fail(`Peep "${dir}" — invalid JSON in peep.json`);
        }
      }
    }
    pass(`${valid} built-in peeps loaded`);
  }

  const installedDir = path.join(OPENPEEP_HOME, "peeps");
  if (fs.existsSync(installedDir)) {
    const installed = fs.readdirSync(installedDir).filter((d) =>
      fs.statSync(path.join(installedDir, d)).isDirectory()
    );
    pass(`${installed.length} installed peeps (from PeepHub)`);
  }

  console.log("");

  // --- Workspaces ---
  console.log("  Workspaces");
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
      for (const space of config.spaces || []) {
        for (const root of space.roots || []) {
          const expanded = root.replace(/^~/, os.homedir());
          if (fs.existsSync(expanded)) pass(`${root}`);
          else fail(`${root} — directory not found`, "Remove from config or create directory");
        }
      }
    } catch {
      fail("Could not parse config.json");
    }
  }

  console.log("");

  // --- Claude Code Integration ---
  console.log("  Claude Code Integration");
  const claudeConfig = path.join(os.homedir(), ".claude.json");
  if (fs.existsSync(claudeConfig)) {
    pass("Claude Code detected (~/.claude.json)");
    if (isPluginInstalled()) {
      pass("OpenPeep MCP server registered");
    } else {
      fail("OpenPeep MCP server not registered", FIX ? "Installing..." : "Run: openpeep doctor --fix");
      if (FIX) {
        const result = installClaudePlugin();
        if (result.success) pass("Plugin installed");
        else fail(result.message);
      }
    }
  } else {
    fail("Claude Code not detected", "Install from https://claude.ai/code");
  }

  console.log("");

  // --- PeepHub ---
  console.log("  PeepHub");
  await new Promise((resolve) => {
    const https = require("https");
    const req = https.get("https://peephub.taiso.ai/api/health", { timeout: 5000 }, (res) => {
      pass("peephub.taiso.ai reachable");
      resolve();
    });
    req.on("error", () => { fail("peephub.taiso.ai unreachable"); resolve(); });
    req.on("timeout", () => { req.destroy(); fail("peephub.taiso.ai timed out"); resolve(); });
  });

  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
      if (config.peephub && config.peephub.apiKey) pass("API key configured");
      else fail("API key not set (publish won't work)", "Set in OpenPeep Settings or config.json");
    } catch {}
  }

  console.log("");

  // --- Summary ---
  console.log("  ─────────────────────────────────────");
  if (issues === 0) {
    console.log("  All checks passed!");
  } else {
    console.log(`  ${issues} issue${issues > 1 ? "s" : ""} found.${FIX ? "" : ' Run "openpeep doctor --fix" to auto-repair.'}`);
  }
  console.log("");
}

module.exports = { run };
