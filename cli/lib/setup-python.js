const { execFileSync } = require("child_process");
const dns = require("dns");
const fs = require("fs");
const path = require("path");
const { VENV_PATH, PKG_REQUIREMENTS } = require("./paths");

function checkInternet() {
  return new Promise((resolve) => {
    dns.lookup("pypi.org", (err) => resolve(!err));
  });
}

function checkPython() {
  for (const cmd of ["python3", "python"]) {
    try {
      const version = execFileSync(cmd, ["--version"], { encoding: "utf8" }).trim();
      const match = version.match(/(\d+)\.(\d+)/);
      if (match && (parseInt(match[1]) > 3 || (parseInt(match[1]) === 3 && parseInt(match[2]) >= 11))) {
        return { command: cmd, version };
      }
    } catch {}
  }
  return null;
}

function createVenv(pythonCmd) {
  if (fs.existsSync(VENV_PATH)) return;
  execFileSync(pythonCmd, ["-m", "venv", VENV_PATH], { stdio: "pipe" });
}

function installDeps() {
  const pip = path.join(VENV_PATH, "bin", "pip");
  // Show pip output so it doesn't look frozen
  execFileSync(pip, ["install", "-r", PKG_REQUIREMENTS, "--progress-bar", "on"], { stdio: ["ignore", "inherit", "inherit"] });
}

function depsInstalled() {
  const pythonBin = path.join(VENV_PATH, "bin", "python");
  try {
    execFileSync(pythonBin, ["-c", "import uvicorn, fastapi, httpx"], { stdio: "pipe" });
    return true;
  } catch { return false; }
}

async function setupPython(log) {
  const python = checkPython();
  if (!python) {
    console.error("  ✗ Python 3.11+ not found. Install it from https://python.org");
    process.exit(1);
  }
  log(`  ✓ ${python.version}`);

  if (!fs.existsSync(VENV_PATH)) {
    const online = await checkInternet();
    if (!online) {
      console.error("  ✗ No internet connection. OpenPeep needs to download Python packages on first run.");
      console.error("    Connect to the internet and try again.");
      process.exit(1);
    }
    log("  ⠋ Creating Python environment...");
    createVenv(python.command);
    installDeps();
    log("  ✓ Backend ready");
  } else {
    // Venv exists — verify deps are installed
    if (!depsInstalled()) {
      log("  ⠋ Installing missing Python packages...");
      installDeps();
      log("  ✓ Backend ready");
    } else {
      log("  ✓ Python environment ready");
    }
  }
}

module.exports = { checkPython, checkInternet, createVenv, installDeps, depsInstalled, setupPython };
