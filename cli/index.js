#!/usr/bin/env node

const command = process.argv[2] || "start";

const COMMANDS = {
  start: () => require("./lib/start").run(),
  stop: () => require("./lib/stop").run(),
  restart: () => require("./lib/restart").run(),
  status: () => require("./lib/status").run(),
  doctor: () => require("./lib/doctor").run(),
  help: () => printHelp(),
};

function printHelp() {
  console.log(`
  Usage: openpeep [command]

  Commands:
    (default)   Start OpenPeep (runs wizard on first use)
    stop        Stop the background server
    restart     Restart the server
    status      Show server status
    doctor      Deep inspection + auto-repair

  Options:
    --foreground    Run server in foreground (for debugging)
    --port <n>      Use a custom port (default: 3000)
    --help          Show this help
`);
}

const handler = COMMANDS[command] || COMMANDS.help;
handler();
