const fs = require("fs");
const path = require("path");
const os = require("os");

const CLAUDE_CONFIG_PATH = path.join(os.homedir(), ".claude.json");

function installClaudePlugin() {
  if (!fs.existsSync(CLAUDE_CONFIG_PATH)) {
    return { success: false, message: "Claude Code not detected (~/.claude.json not found). Install Claude Code first, then run: openpeep doctor --fix" };
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(CLAUDE_CONFIG_PATH, "utf8"));
  } catch {
    return { success: false, message: "Could not parse ~/.claude.json" };
  }

  // Register MCP server in ~/.claude.json
  if (!config.mcpServers) config.mcpServers = {};
  const mcpBin = path.resolve(__dirname, "../../mcp/dist/index.js");
  config.mcpServers.openpeep = {
    command: "node",
    args: [mcpBin],
  };
  fs.writeFileSync(CLAUDE_CONFIG_PATH, JSON.stringify(config, null, 2));

  return { success: true };
}

function isPluginInstalled() {
  if (!fs.existsSync(CLAUDE_CONFIG_PATH)) return false;
  try {
    const config = JSON.parse(fs.readFileSync(CLAUDE_CONFIG_PATH, "utf8"));
    return !!(config.mcpServers && config.mcpServers.openpeep);
  } catch {
    return false;
  }
}

function removePlugin() {
  if (fs.existsSync(CLAUDE_CONFIG_PATH)) {
    try {
      const config = JSON.parse(fs.readFileSync(CLAUDE_CONFIG_PATH, "utf8"));
      if (config.mcpServers) delete config.mcpServers.openpeep;
      fs.writeFileSync(CLAUDE_CONFIG_PATH, JSON.stringify(config, null, 2));
    } catch {}
  }
}

module.exports = { installClaudePlugin, isPluginInstalled, removePlugin };
