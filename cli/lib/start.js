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

  // Show version + build
  const pkg = require("../../package.json");
  let build;
  try { build = require("../build-info.json"); } catch {}
  const ver = build ? `${pkg.version} (${build.build})` : pkg.version;
  console.log(`  OpenPeep v${ver}`);

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
    await setupPython(console.log);
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

  // Wait for server to actually start (up to 10 seconds)
  const http = require("http");
  let started = false;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    // Check if process is still alive
    try { process.kill(child.pid, 0); } catch {
      console.error("  ✗ Server failed to start. Check logs:");
      console.error(`    ${logFile}`);
      try { fs.unlinkSync(PID_PATH); } catch {}
      return;
    }
    // Try health check
    started = await new Promise((resolve) => {
      const req = http.get(`http://localhost:${port}/api/health`, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on("error", () => resolve(false));
      req.setTimeout(500, () => { req.destroy(); resolve(false); });
    });
    if (started) break;
  }

  if (started) {
    const url = `http://localhost:${port}`;
    console.log(`  ✓ OpenPeep running → ${url} (pid ${child.pid})`);
    console.log("");
    // Open browser
    const { exec } = require("child_process");
    const openCmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    exec(`${openCmd} ${url}`);
  } else {
    console.error("  ✗ Server started but not responding. Check logs:");
    console.error(`    ${logFile}`);
  }
}


module.exports = { run, isRunning };
