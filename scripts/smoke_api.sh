#!/bin/bash
set -e

# Backend is behind Nginx at 8016
BASE_URL="http://localhost:8016/api"
USERNAME="admin"
PASSWORD="changeme"

echo "1. Authenticating..."
TOKEN=$(curl -s -X POST "$BASE_URL/auth/login/" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$USERNAME\", \"password\": \"$PASSWORD\"}" | jq -r '.access')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "Login failed. Check that the admin user exists and password is correct."
  exit 1
fi
echo "Token obtained."

echo "2. Fetching Projects..."
curl -s -X GET "$BASE_URL/projects/" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo "3. Creating Project..."
RESP=$(curl -s -X POST "$BASE_URL/projects/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Smoke Test Project", "description": "Created by script"}')
PROJECT_ID=$(echo $RESP | jq -r '.id')
echo "Response: $RESP"
echo "Created Project ID: $PROJECT_ID"

if [ "$PROJECT_ID" == "null" ] || [ -z "$PROJECT_ID" ]; then
    echo "Failed to create project."
    exit 1
fi

echo "4. Importing CSV..."
# Create a dummy CSV if not exists - ensuring no weird characters
echo "Section,Standard,Indicator" > INDICATORS_TEMPLATE.csv
echo "Sec1,Std1,Ind1" >> INDICATORS_TEMPLATE.csv

IMPORT_RESP=$(curl -s -X POST "$BASE_URL/projects/$PROJECT_ID/import-indicators/" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@INDICATORS_TEMPLATE.csv")
echo "Import Response: $IMPORT_RESP"

echo "5. Checking Upcoming Indicators..."
curl -s -X GET "$BASE_URL/projects/$PROJECT_ID/upcoming/" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo "6. Checking Audit Logs..."
LOGS=$(curl -s -X GET "$BASE_URL/audit-logs/" \
  -H "Authorization: Bearer $TOKEN")
echo "$LOGS" | jq .
LOG_COUNT=$(echo "$LOGS" | jq 'if type=="array" then length else .results | length end')
echo "Audit Logs found: $LOG_COUNT"

if [ "$LOG_COUNT" -gt 0 ]; then
    echo "Audit logging verified."
else
    echo "WARNING: No audit logs found!"
fi

echo "Smoke Test Complete."
