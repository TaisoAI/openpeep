const fs = require("fs");
const path = require("path");
const { DEMO_DIR, PKG_SAMPLES } = require("./paths");

function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function setupDemoWorkspace() {
  if (fs.existsSync(DEMO_DIR)) return;
  copyRecursive(PKG_SAMPLES, DEMO_DIR);
}

module.exports = { setupDemoWorkspace };
