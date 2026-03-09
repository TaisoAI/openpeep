const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { VENV_PATH, PKG_REQUIREMENTS } = require("./paths");

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
  execFileSync(pip, ["install", "-r", PKG_REQUIREMENTS, "--quiet"], { stdio: "pipe" });
}

function setupPython(log) {
  const python = checkPython();
  if (!python) {
    console.error("  ✗ Python 3.11+ not found. Install it from https://python.org");
    process.exit(1);
  }
  log(`  ✓ ${python.version}`);

  if (!fs.existsSync(VENV_PATH)) {
    log("  ⠋ Creating Python environment...");
    createVenv(python.command);
    installDeps();
    log("  ✓ Backend ready");
  } else {
    log("  ✓ Python environment exists");
  }
}

module.exports = { checkPython, createVenv, installDeps, setupPython };
