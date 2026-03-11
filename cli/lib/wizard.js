const readline = require("readline");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { OPENPEEP_HOME, CONFIG_PATH, DEMO_DIR } = require("./paths");

function ask(rl, question, defaultVal) {
  return new Promise((resolve) => {
    const suffix = defaultVal ? ` (${defaultVal})` : "";
    rl.question(`  ${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultVal || "");
    });
  });
}

function askYN(rl, question, defaultYes = true) {
  return new Promise((resolve) => {
    const hint = defaultYes ? "(Y/n)" : "(y/N)";
    rl.question(`  ${question} ${hint} `, (answer) => {
      const a = answer.trim().toLowerCase();
      if (a === "") resolve(defaultYes);
      else resolve(a === "y" || a === "yes");
    });
  });
}

async function runWizard() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log("");
  console.log("  ┌─────────────────────────────────────┐");
  console.log("  │  Welcome to OpenPeep v0.1.0         │");
  console.log("  └─────────────────────────────────────┘");
  console.log("");

  // 1. Create config with just the demo workspace
  fs.mkdirSync(OPENPEEP_HOME, { recursive: true });

  const config = {
    spaces: [
      {
        name: "OpenPeep Demo",
        icon: "🎯",
        roots: [DEMO_DIR],
        statuses: ["0-Welcome", "1-Basics", "2-Structured", "3-Custom Types"],
      },
    ],
    defaultStatuses: ["Idea", "Planning", "In Progress", "Analyze", "Archive"],
    fileAssociations: { overrides: [] },
    peepSettings: {},
    devMode: false,
    peephub: { url: "https://peephub.taiso.ai", apiKey: "" },
  };

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log("  ✓ Config saved");

  // 3. Copy demo workspace
  console.log("");
  console.log("  Setting up demo workspace with sample files...");
  const { setupDemoWorkspace } = require("./demo");
  setupDemoWorkspace();
  console.log("  ✓ ~/.openpeep/demo/ created");
  console.log("    ├── 1-basics/        (txt, images, svg)");
  console.log("    ├── 2-structured/    (md, json, csv)");
  console.log("    ├── 3-custom-types/  (meeting notes, diagrams)");
  console.log("    └── 0-welcome/       ← start here!");
  console.log("");

  // 4. Claude Code plugin
  const installPlugin = await askYN(rl, "Install Claude Code MCP server?");
  if (installPlugin) {
    const { installClaudePlugin } = require("./claude-plugin");
    const result = installClaudePlugin();
    if (result.success) {
      console.log("  ✓ Added OpenPeep MCP server to Claude Code");
      console.log("");
      console.log("  For full plugin support (skills + agents), run in Claude Code:");
      console.log("    /plugin install openpeep");
    } else {
      console.log(`  ⚠ ${result.message}`);
    }
  }

  rl.close();
  return config;
}

module.exports = { runWizard, ask, askYN };
