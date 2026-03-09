const path = require("path");
const os = require("os");

const OPENPEEP_HOME = path.join(os.homedir(), ".openpeep");
const CONFIG_PATH = path.join(OPENPEEP_HOME, "config.json");
const VENV_PATH = path.join(OPENPEEP_HOME, "venv");
const PID_PATH = path.join(OPENPEEP_HOME, "openpeep.pid");
const LOG_DIR = path.join(OPENPEEP_HOME, "logs");
const DEMO_DIR = path.join(OPENPEEP_HOME, "demo");
const PEEPS_DIR = path.join(OPENPEEP_HOME, "peeps");

// Paths relative to the npm package (where cli/index.js lives)
const PKG_ROOT = path.resolve(__dirname, "../..");
const PKG_BACKEND = path.join(PKG_ROOT, "backend");
const PKG_FRONTEND_DIST = path.join(PKG_ROOT, "cli", "frontend-dist");
const PKG_PEEPS = path.join(PKG_ROOT, "peeps");
const PKG_SAMPLES = path.join(PKG_ROOT, "samples");
const PKG_REQUIREMENTS = path.join(PKG_ROOT, "backend", "requirements.txt");

module.exports = {
  OPENPEEP_HOME, CONFIG_PATH, VENV_PATH, PID_PATH, LOG_DIR, DEMO_DIR, PEEPS_DIR,
  PKG_ROOT, PKG_BACKEND, PKG_FRONTEND_DIST, PKG_PEEPS, PKG_SAMPLES, PKG_REQUIREMENTS,
};
