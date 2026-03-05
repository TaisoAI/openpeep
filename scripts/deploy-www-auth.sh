#!/usr/bin/env bash
# Deploy openpeep-www as a dynamic Next.js app on Lightsail (supereasy)
#
# Prerequisites:
#   - SSH access to supereasy (34.209.175.223)
#   - Cognito setup completed (cognito-setup.sh)
#   - openpeep_www code pushed to its repo
#
# This script is meant to be run FROM your local machine.
# It SSHes into supereasy to configure the server.

set -euo pipefail

SERVER="34.209.175.223"
SSH_USER="ubuntu"
APP_DIR="/srv/supereasy/apps/openpeep-www"
PORT=3100

echo "=== Step 1: Deploy www code to server ==="
echo "Make sure the openpeep_www code is on the server at $APP_DIR"
echo "e.g.: rsync -avz --exclude node_modules --exclude .next /path/to/openpeep_www/ $SSH_USER@$SERVER:$APP_DIR/"
echo ""
read -p "Press Enter once code is deployed, or Ctrl+C to abort..."

echo "=== Step 2: Install deps and build on server ==="

ssh "$SSH_USER@$SERVER" bash -s <<'REMOTE'
set -euo pipefail
APP_DIR="/srv/supereasy/apps/openpeep-www"

cd "$APP_DIR"
npm ci --production=false
npx next build
echo "Build complete."
REMOTE

echo "=== Step 3: Create systemd service ==="

ssh "$SSH_USER@$SERVER" sudo bash -s <<'REMOTE'
cat > /etc/systemd/system/openpeep-www.service <<'EOF'
[Unit]
Description=OpenPeep WWW (Next.js)
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/srv/supereasy/apps/openpeep-www
EnvironmentFile=/srv/supereasy/apps/openpeep-www/.env
ExecStart=/usr/bin/npx next start -p 3100
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable openpeep-www
systemctl restart openpeep-www
systemctl status openpeep-www --no-pager
REMOTE

echo "=== Step 4: Update Caddy config ==="
echo ""
echo "Edit /etc/caddy/Caddyfile on the server."
echo "Change the openpeep.taiso.ai block from file_server to reverse_proxy:"
echo ""
echo "  openpeep.taiso.ai {"
echo "    reverse_proxy localhost:3100"
echo "  }"
echo ""
echo "Then run: sudo systemctl reload caddy"
echo ""
read -p "Press Enter once Caddy is updated..."

echo "=== Step 5: Set env vars for www ==="
echo ""
echo "Create/edit $APP_DIR/.env on the server with:"
echo ""
echo "  NEXTAUTH_URL=https://openpeep.taiso.ai"
echo "  NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>"
echo "  COGNITO_REGION=us-west-2"
echo "  COGNITO_USER_POOL_ID=<from cognito-setup.sh>"
echo "  COGNITO_CLIENT_ID=<www client id from cognito-setup.sh>"
echo "  COGNITO_CLIENT_SECRET=<www client secret from cognito-setup.sh>"
echo ""
echo "Then restart: sudo systemctl restart openpeep-www"

echo ""
echo "=== Done ==="
echo "Visit https://openpeep.taiso.ai to verify."
