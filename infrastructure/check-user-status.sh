#!/bin/bash
# Check User Status in Cognito

AWS_REGION="us-east-1"
USER_POOL_ID="us-east-1_IL2PMU5Qv"
USER_EMAIL="ejoseph@cnctherapy.com"

echo "Checking user status for: $USER_EMAIL"
echo ""

aws cognito-idp admin-get-user \
  --user-pool-id $USER_POOL_ID \
  --username "$USER_EMAIL" \
  --region $AWS_REGION \
  --output json

echo ""
echo "If the user exists, you should see their details above."
