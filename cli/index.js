#!/usr/bin/env node

const args = process.argv.slice(2);

// Check for --help anywhere
if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

// Find the first non-flag argument as the command, skipping values of --port
const FLAGS_WITH_VALUES = new Set(["--port"]);
let command = "start";
for (let i = 0; i < args.length; i++) {
  if (FLAGS_WITH_VALUES.has(args[i])) { i++; continue; }
  if (args[i].startsWith("-")) continue;
  command = args[i];
  break;
}

const COMMANDS = {
  start: () => require("./lib/start").run(),
  stop: () => require("./lib/stop").run(),
  restart: () => require("./lib/restart").run(),
  status: () => require("./lib/status").run(),
  doctor: () => require("./lib/doctor").run(),
  mcp: () => require("./lib/mcp").run(),
  help: () => printHelp(),
};

function getBuildInfo() {
  try { return require("./build-info.json"); } catch { return null; }
}

function printHelp() {
  const pkg = require("../package.json");
  const build = getBuildInfo();
  const version = build ? `${pkg.version} (${build.build})` : pkg.version;
  console.log(`
  OpenPeep v${version}

  Usage: openpeep [command]

  Commands:
    (default)   Start OpenPeep (runs wizard on first use)
    stop        Stop the background server
    restart     Restart the server
    status      Show server status
    doctor      Deep inspection + auto-repair
    mcp         Run the MCP server (used by Claude Code)

  Options:
    --foreground    Run server in foreground (for debugging)
    --port <n>      Use a custom port (default: 3000)
    --help          Show this help
`);
}

const handler = COMMANDS[command] || COMMANDS.help;
handler();
