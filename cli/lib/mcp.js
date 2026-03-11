const path = require("path");
const { spawn } = require("child_process");

function run() {
  const mcpEntry = path.resolve(__dirname, "../../mcp/dist/index.js");
  const child = spawn(process.execPath, [mcpEntry], { stdio: "inherit" });
  child.on("exit", (code) => process.exit(code || 0));
}

module.exports = { run };
