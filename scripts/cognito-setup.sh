#!/usr/bin/env bash
# Cognito User Pool Setup for OpenPeep Unified Auth
# Run this script with AWS CLI configured for us-west-2
#
# Prerequisites:
#   - AWS CLI v2 installed and configured
#   - Permissions: cognito-idp:*
#
# Usage:
#   chmod +x scripts/cognito-setup.sh
#   ./scripts/cognito-setup.sh

set -euo pipefail

REGION="us-west-2"
POOL_NAME="openpeep"
DOMAIN_PREFIX="openpeep-auth"

echo "=== Creating Cognito User Pool ==="

POOL_ID=$(aws cognito-idp create-user-pool \
  --pool-name "$POOL_NAME" \
  --region "$REGION" \
  --auto-verified-attributes email \
  --username-attributes email \
  --username-configuration "CaseSensitive=false" \
  --mfa-configuration OFF \
  --account-recovery-setting '{"RecoveryMechanisms":[{"Priority":1,"Name":"verified_email"}]}' \
  --schema '[
    {"Name":"email","Required":true,"Mutable":true},
    {"Name":"name","Required":false,"Mutable":true}
  ]' \
  --query 'UserPool.Id' \
  --output text)

echo "User Pool ID: $POOL_ID"

echo "=== Setting up Hosted UI Domain ==="

aws cognito-idp create-user-pool-domain \
  --domain "$DOMAIN_PREFIX" \
  --user-pool-id "$POOL_ID" \
  --region "$REGION"

echo "Hosted UI: https://${DOMAIN_PREFIX}.auth.${REGION}.amazoncognito.com"

echo "=== Creating App Client: peephub-web (confidential) ==="

PEEPHUB_CLIENT=$(aws cognito-idp create-user-pool-client \
  --user-pool-id "$POOL_ID" \
  --region "$REGION" \
  --client-name "peephub-web" \
  --generate-secret \
  --explicit-auth-flows ALLOW_REFRESH_TOKEN_AUTH ALLOW_USER_SRP_AUTH \
  --supported-identity-providers COGNITO \
  --callback-urls '["https://peephub.taiso.ai/api/auth/callback/cognito","http://localhost:3000/api/auth/callback/cognito"]' \
  --logout-urls '["https://peephub.taiso.ai","http://localhost:3000"]' \
  --allowed-o-auth-flows code \
  --allowed-o-auth-scopes openid email profile \
  --allowed-o-auth-flows-user-pool-client \
  --query 'UserPoolClient.[ClientId,ClientSecret]' \
  --output text)

PEEPHUB_CLIENT_ID=$(echo "$PEEPHUB_CLIENT" | awk '{print $1}')
PEEPHUB_CLIENT_SECRET=$(echo "$PEEPHUB_CLIENT" | awk '{print $2}')

echo "PeepHub Client ID:     $PEEPHUB_CLIENT_ID"
echo "PeepHub Client Secret: $PEEPHUB_CLIENT_SECRET"

echo "=== Creating App Client: openpeep-www (confidential) ==="

WWW_CLIENT=$(aws cognito-idp create-user-pool-client \
  --user-pool-id "$POOL_ID" \
  --region "$REGION" \
  --client-name "openpeep-www" \
  --generate-secret \
  --explicit-auth-flows ALLOW_REFRESH_TOKEN_AUTH ALLOW_USER_SRP_AUTH \
  --supported-identity-providers COGNITO \
  --callback-urls '["https://openpeep.taiso.ai/api/auth/callback/cognito","http://localhost:3100/api/auth/callback/cognito"]' \
  --logout-urls '["https://openpeep.taiso.ai","http://localhost:3100"]' \
  --allowed-o-auth-flows code \
  --allowed-o-auth-scopes openid email profile \
  --allowed-o-auth-flows-user-pool-client \
  --query 'UserPoolClient.[ClientId,ClientSecret]' \
  --output text)

WWW_CLIENT_ID=$(echo "$WWW_CLIENT" | awk '{print $1}')
WWW_CLIENT_SECRET=$(echo "$WWW_CLIENT" | awk '{print $2}')

echo "WWW Client ID:     $WWW_CLIENT_ID"
echo "WWW Client Secret: $WWW_CLIENT_SECRET"

echo "=== Creating App Client: openpeep-desktop (public, PKCE) ==="

DESKTOP_CLIENT_ID=$(aws cognito-idp create-user-pool-client \
  --user-pool-id "$POOL_ID" \
  --region "$REGION" \
  --client-name "openpeep-desktop" \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_REFRESH_TOKEN_AUTH ALLOW_USER_SRP_AUTH \
  --supported-identity-providers COGNITO \
  --callback-urls '["http://localhost:19876/callback"]' \
  --logout-urls '["http://localhost:19876"]' \
  --allowed-o-auth-flows code \
  --allowed-o-auth-scopes openid email profile \
  --allowed-o-auth-flows-user-pool-client \
  --query 'UserPoolClient.ClientId' \
  --output text)

echo "Desktop Client ID: $DESKTOP_CLIENT_ID"

echo ""
echo "=== Summary ==="
echo "Region:              $REGION"
echo "User Pool ID:        $POOL_ID"
echo "Hosted UI Domain:    https://${DOMAIN_PREFIX}.auth.${REGION}.amazoncognito.com"
echo ""
echo "PeepHub Client ID:     $PEEPHUB_CLIENT_ID"
echo "PeepHub Client Secret: $PEEPHUB_CLIENT_SECRET"
echo ""
echo "WWW Client ID:         $WWW_CLIENT_ID"
echo "WWW Client Secret:     $WWW_CLIENT_SECRET"
echo ""
echo "Desktop Client ID:     $DESKTOP_CLIENT_ID"
echo ""
echo "=== Next Steps ==="
echo "1. Run scripts/cognito-google-provider.sh to add Google social login"
echo "2. Copy these values into your .env files"
