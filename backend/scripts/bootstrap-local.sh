#!/usr/bin/env bash
set -euo pipefail

# Ensure local node binaries (e.g. esbuild) are on PATH (npm workspaces)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ---- Prerequisites ---------------------------------------------------------
if ! command -v aws >/dev/null 2>&1; then
  echo "Error: aws CLI not found. Install it first."
  exit 1
fi

# ---- Dummy AWS credentials for local emulation ------------------------------
export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"
export AWS_SESSION_TOKEN="test"
export AWS_PAGER=""
export AWS_REGION="eu-central-1"

# ---- Config -----------------------------------------------------------------
DDB_ENDPOINT="http://localhost:8000"
SQS_ENDPOINT="http://localhost:4566"

PLAYERS_TABLE="Players"
GUESSES_TABLE="Guesses"
QUEUE_NAME="guess-resolver"

echo "Bootstrapping local resources..."
echo "DynamoDB: $DDB_ENDPOINT"
echo "LocalStack(SQS): $SQS_ENDPOINT"

# ---- Wait for LocalStack SQS -------------------------------------------------
echo "Waiting for LocalStack SQS..."
ready=false
for _ in {1..30}; do
  if aws --endpoint-url "$SQS_ENDPOINT" sqs list-queues >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done

if [[ "$ready" != "true" ]]; then
  echo "LocalStack SQS not ready at $SQS_ENDPOINT"
  exit 1
fi
echo "LocalStack SQS is ready."

# ---- DynamoDB tables (idempotent) --------------------------------------------
echo "Creating DynamoDB tables..."
aws dynamodb create-table \
  --endpoint-url "$DDB_ENDPOINT" \
  --table-name "$PLAYERS_TABLE" \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "$AWS_REGION" >/dev/null 2>&1 || true

aws dynamodb create-table \
  --endpoint-url "$DDB_ENDPOINT" \
  --table-name "$GUESSES_TABLE" \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "$AWS_REGION" >/dev/null 2>&1 || true

# ---- SQS queue (idempotent) --------------------------------------------------
echo "Creating SQS queue..."
aws --endpoint-url "$SQS_ENDPOINT" sqs create-queue \
  --queue-name "$QUEUE_NAME" \
  --region "$AWS_REGION" >/dev/null 2>&1 || true

# Get Queue URL
QUEUE_URL=$(aws --endpoint-url "$SQS_ENDPOINT" sqs get-queue-url --queue-name "$QUEUE_NAME" --query QueueUrl --output text)

echo " Setup complete!"
echo " Queue URL: $QUEUE_URL"
