#!/usr/bin/env bash
# Add Google as a social identity provider to the Cognito user pool
#
# Prerequisites:
#   1. Run cognito-setup.sh first to get the User Pool ID
#   2. Create a Google OAuth 2.0 app at https://console.cloud.google.com/apis/credentials
#      - Application type: Web application
#      - Authorized redirect URI:
#        https://openpeep-auth.auth.us-west-2.amazoncognito.com/oauth2/idpresponse
#      - Note the Client ID and Client Secret
#
# Usage:
#   ./scripts/cognito-google-provider.sh <USER_POOL_ID> <GOOGLE_CLIENT_ID> <GOOGLE_CLIENT_SECRET>

set -euo pipefail

if [ $# -ne 3 ]; then
  echo "Usage: $0 <USER_POOL_ID> <GOOGLE_CLIENT_ID> <GOOGLE_CLIENT_SECRET>"
  echo ""
  echo "Before running this script, create a Google OAuth app at:"
  echo "  https://console.cloud.google.com/apis/credentials"
  echo ""
  echo "Set the Authorized redirect URI to:"
  echo "  https://openpeep-auth.auth.us-west-2.amazoncognito.com/oauth2/idpresponse"
  exit 1
fi

POOL_ID="$1"
GOOGLE_ID="$2"
GOOGLE_SECRET="$3"
REGION="us-west-2"

echo "=== Registering Google Identity Provider ==="

aws cognito-idp create-identity-provider \
  --user-pool-id "$POOL_ID" \
  --region "$REGION" \
  --provider-name Google \
  --provider-type Google \
  --provider-details '{
    "client_id": "'"$GOOGLE_ID"'",
    "client_secret": "'"$GOOGLE_SECRET"'",
    "authorize_scopes": "openid email profile"
  }' \
  --attribute-mapping '{"email":"email","name":"name","username":"sub"}'

echo "Google provider registered."

echo "=== Updating App Clients to support Google ==="

# Get all app client IDs
CLIENT_IDS=$(aws cognito-idp list-user-pool-clients \
  --user-pool-id "$POOL_ID" \
  --region "$REGION" \
  --query 'UserPoolClients[].ClientId' \
  --output text)

for CLIENT_ID in $CLIENT_IDS; do
  CLIENT_NAME=$(aws cognito-idp describe-user-pool-client \
    --user-pool-id "$POOL_ID" \
    --client-id "$CLIENT_ID" \
    --region "$REGION" \
    --query 'UserPoolClient.ClientName' \
    --output text)

  echo "Updating client: $CLIENT_NAME ($CLIENT_ID)"

  aws cognito-idp update-user-pool-client \
    --user-pool-id "$POOL_ID" \
    --client-id "$CLIENT_ID" \
    --region "$REGION" \
    --supported-identity-providers COGNITO Google \
    2>/dev/null || echo "  (skipped — may need manual update with full client config)"
done

echo ""
echo "=== Done ==="
echo "Google sign-in is now available on the Cognito hosted UI."
echo "Users can sign in with Google or email/password."
