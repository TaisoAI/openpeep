const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { OPENPEEP_HOME, VENV_PATH, PID_PATH, LOG_DIR, CONFIG_PATH,
        PKG_FRONTEND_DIST, PKG_ROOT } = require("./paths");
const { isFirstRun } = require("./first-run");
const { setupPython } = require("./setup-python");
const { runWizard } = require("./wizard");

function isRunning() {
  if (!fs.existsSync(PID_PATH)) return false;
  const pid = parseInt(fs.readFileSync(PID_PATH, "utf8").trim());
  try { process.kill(pid, 0); return true; } catch { return false; }
}

async function run() {
  const foreground = process.argv.includes("--foreground");
  const portIdx = process.argv.indexOf("--port");
  const port = portIdx !== -1 ? parseInt(process.argv[portIdx + 1]) : 3000;

  // Check if already running
  if (isRunning()) {
    const pid = fs.readFileSync(PID_PATH, "utf8").trim();
    console.log(`  ✓ OpenPeep already running → http://localhost:${port} (pid ${pid})`);
    return;
  }

  // First run → wizard
  if (isFirstRun()) {
    console.log("");
    console.log("  Checking requirements...");
    setupPython(console.log);
    console.log("");
    await runWizard();
    console.log("");
  }

  // Ensure dirs exist
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.mkdirSync(OPENPEEP_HOME, { recursive: true });

  const pythonBin = path.join(VENV_PATH, "bin", "python");
  const env = {
    ...process.env,
    OPENPEEP_STATIC_DIR: PKG_FRONTEND_DIST,
    OPENPEEP_CONFIG: CONFIG_PATH,
    PYTHONPATH: PKG_ROOT,
  };

  if (foreground) {
    console.log(`  Starting OpenPeep (foreground) → http://localhost:${port}`);
    console.log("  Press Ctrl+C to stop.");
    console.log("");
    const child = spawn(pythonBin, [
      "-m", "uvicorn", "backend.main:app", "--port", String(port),
    ], { env, stdio: "inherit", cwd: PKG_ROOT });
    child.on("exit", () => process.exit());
    return;
  }

  // Background daemon
  const logFile = path.join(LOG_DIR, "server.log");
  const out = fs.openSync(logFile, "a");
  const child = spawn(pythonBin, [
    "-m", "uvicorn", "backend.main:app", "--port", String(port),
  ], { env, stdio: ["ignore", out, out], detached: true, cwd: PKG_ROOT });

  child.unref();
  fs.writeFileSync(PID_PATH, String(child.pid));

  console.log(`  ✓ OpenPeep running → http://localhost:${port} (pid ${child.pid})`);
  printClaudePrompts();
}

function printClaudePrompts() {
  console.log("");
  console.log("  ──────────────────────────────────────");
  console.log("  Try these in Claude Code:");
  console.log("");
  console.log('  1. "create a meeting notes file for tomorrow\'s standup"');
  console.log('  2. "make a slide deck about our Q1 results"');
  console.log('  3. "create a CSV tracking my monthly expenses"');
  console.log('  4. "create a json config for a new project"');
  console.log("");
  console.log("  OpenPeep will preview them live!");
  console.log("  ──────────────────────────────────────");
  console.log("");
}

module.exports = { run, isRunning };
