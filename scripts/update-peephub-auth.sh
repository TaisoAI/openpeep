#!/usr/bin/env bash
# Update PeepHub env vars on Lightsail to use Cognito instead of GitHub/Google/Apple
#
# Run this AFTER cognito-setup.sh has been executed.

set -euo pipefail

SERVER="34.209.175.223"
SSH_USER="ubuntu"
PEEPHUB_DIR="/srv/supereasy/apps/peephub"

echo "=== Update PeepHub env vars ==="
echo ""
echo "SSH into the server and edit $PEEPHUB_DIR/.env:"
echo "  ssh $SSH_USER@$SERVER"
echo ""
echo "Remove these vars:"
echo "  GITHUB_CLIENT_ID"
echo "  GITHUB_CLIENT_SECRET"
echo "  GOOGLE_CLIENT_ID"
echo "  GOOGLE_CLIENT_SECRET"
echo "  APPLE_CLIENT_ID"
echo "  APPLE_CLIENT_SECRET"
echo ""
echo "Add these vars:"
echo "  COGNITO_REGION=us-west-2"
echo "  COGNITO_USER_POOL_ID=<from cognito-setup.sh>"
echo "  COGNITO_CLIENT_ID=<peephub client id from cognito-setup.sh>"
echo "  COGNITO_CLIENT_SECRET=<peephub client secret from cognito-setup.sh>"
echo ""
echo "Then restart PeepHub:"
echo "  sudo systemctl restart peephub"
echo ""
echo "Verify at https://peephub.taiso.ai/auth/signin"
