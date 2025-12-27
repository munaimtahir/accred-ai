#!/usr/bin/env bash
set -euo pipefail

# AccrediFy: deploy + seed + import demo CSV + smoke test core API flows.
#
# Intended usage (on VPS):
#   cd /munaim/keystone/repos/accred-ai
#   bash scripts/vps_deploy_and_audit.sh
#
# Output:
#   - audit_report.md (in repo root)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f "docker-compose.yml" ]]; then
  echo "ERROR: Run from the repo root (docker-compose.yml not found)."
  exit 1
fi

DC="docker compose"
if ! $DC version >/dev/null 2>&1; then
  if command -v docker-compose >/dev/null 2>&1; then
    DC="docker-compose"
  else
    echo "ERROR: docker compose plugin (or docker-compose) is required."
    exit 1
  fi
fi

timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
report="audit_report.md"

BASE_URL="${BASE_URL:-http://localhost}"
API_URL="${API_URL:-$BASE_URL/api}"

CSV_HOST_PATH="${CSV_HOST_PATH:-$ROOT_DIR/Final PHC list.csv}"
PROJECT_NAME="${PROJECT_NAME:-PHC Laboratory Accreditation Checklist (Demo)}"

ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin123!ChangeMe}"

DB_PASSWORD="${DB_PASSWORD:-changeme}"
DJANGO_SECRET_KEY="${DJANGO_SECRET_KEY:-}"

gen_secret() {
  python3 - <<'PY'
import secrets
print(secrets.token_urlsafe(48))
PY
}

if [[ -z "$DJANGO_SECRET_KEY" ]]; then
  DJANGO_SECRET_KEY="$(gen_secret)"
fi

write_report_header() {
  cat > "$report" <<EOF
## AccrediFy VPS Deployment + Functional Audit

- **Timestamp (UTC)**: $timestamp
- **Repo**: $ROOT_DIR
- **Base URL**: $BASE_URL
- **API URL**: $API_URL
- **CSV**: $CSV_HOST_PATH
- **Project name**: $PROJECT_NAME

### Results (auto)
EOF
}

append() {
  printf "%s\n" "$*" >> "$report"
}

pass() { append "- **PASS**: $*"; }
fail() { append "- **FAIL**: $*"; }
note() { append "- **NOTE**: $*"; }

http_json() {
  # args: METHOD URL BODY(optional)
  local method="$1"; shift
  local url="$1"; shift
  local body="${1:-}"
  if [[ -n "$body" ]]; then
    curl -fsS -X "$method" "$url" -H 'Content-Type: application/json' --data "$body"
  else
    curl -fsS -X "$method" "$url"
  fi
}

py_get() {
  # Extract JSON using python (no jq dependency).
  # args: python_expr (evaluated with `data` bound)
  python3 - "$1" <<'PY'
import json,sys
expr=sys.argv[1]
try:
    text = sys.stdin.read().strip()
    if not text:
        print("")
        sys.exit(0)
    data=json.loads(text)
    result = eval(expr, {"data": data})
    print(result if result is not None else "")
except (json.JSONDecodeError, ValueError) as e:
    print("")
    sys.exit(0)
PY
}

write_report_header

append ""
append "### Deployment"

if [[ ! -f ".env" ]]; then
  cat > .env <<EOF
DB_PASSWORD=$DB_PASSWORD
DJANGO_SECRET_KEY=$DJANGO_SECRET_KEY
DEBUG=False
# Optional: enable AI features
# GEMINI_API_KEY=
EOF
  note "Created .env with DB_PASSWORD + DJANGO_SECRET_KEY (edit for production hardening)."
else
  note ".env already exists (leaving it unchanged)."
fi

append ""
append "### Bring up Docker services"

$DC up -d --build
pass "docker compose up -d --build"

append ""
append "### Wait for backend health"

for i in {1..60}; do
  if curl -fsS "$API_URL/health/" >/dev/null 2>&1; then
    pass "Backend health check OK: $API_URL/health/"
    break
  fi
  sleep 2
  if [[ "$i" == "60" ]]; then
    fail "Backend health check timed out. Inspect logs: $DC logs --tail=200 backend nginx"
    exit 1
  fi
done

append ""
append "### Seed + import demo data"

$DC exec -T backend python manage.py seed_data >/dev/null 2>&1 && pass "seed_data ran" || note "seed_data not run (may already exist or command failed)"

backend_id="$($DC ps -q backend)"
if [[ -z "$backend_id" ]]; then
  fail "Could not locate backend container id"
  exit 1
fi

if [[ -f "$CSV_HOST_PATH" ]]; then
  docker cp "$CSV_HOST_PATH" "$backend_id:/tmp/phc.csv"
  pass "Copied CSV into backend container: /tmp/phc.csv"
  $DC exec -T backend python manage.py import_phc_csv /tmp/phc.csv --project-name "$PROJECT_NAME" >/dev/null
  pass "Imported CSV into Project='$PROJECT_NAME'"
else
  fail "CSV not found on host: $CSV_HOST_PATH"
  exit 1
fi

append ""
append "### Create admin user (best effort)"
if $DC exec -T \
  -e DJANGO_SUPERUSER_USERNAME="$ADMIN_USER" \
  -e DJANGO_SUPERUSER_EMAIL="$ADMIN_EMAIL" \
  -e DJANGO_SUPERUSER_PASSWORD="$ADMIN_PASSWORD" \
  backend python manage.py createsuperuser --noinput >/dev/null 2>&1; then
  pass "Created Django superuser '$ADMIN_USER' (password in ADMIN_PASSWORD env var)"
else
  note "Superuser create skipped/failed (likely already exists)."
fi

append ""
append "### API smoke tests"

# 1) Projects list
projects_json="$(curl -fsS "$API_URL/projects/")"
projects_count="$(printf "%s" "$projects_json" | py_get "len(data)")"
if [[ "$projects_count" -gt 0 ]]; then
  pass "GET /projects/ returned $projects_count projects"
else
  fail "GET /projects/ returned 0 projects"
  exit 1
fi

project_id="$(printf "%s" "$projects_json" | py_get "next((p['id'] for p in data if p.get('name') == '$PROJECT_NAME'), '')")"
if [[ -n "$project_id" ]]; then
  pass "Imported project found: id=$project_id"
else
  fail "Imported project not found by name='$PROJECT_NAME'"
  exit 1
fi

# 2) Indicators list filtered by project
indicators_json="$(curl -fsS "$API_URL/indicators/?project=$project_id")"
indicators_count="$(printf "%s" "$indicators_json" | py_get "len(data)")"
if [[ "$indicators_count" -gt 0 ]]; then
  pass "GET /indicators/?project=... returned $indicators_count indicators"
else
  fail "No indicators returned for imported project"
  exit 1
fi

first_indicator_id="$(printf "%s" "$indicators_json" | py_get "data[0]['id']")"

# 3) Patch indicator fields
patched="$(http_json PATCH "$API_URL/indicators/$first_indicator_id/" '{"status":"In Progress","notes":"Automated audit: set to In Progress","assignee":"Demo User"}')"
patched_status="$(printf "%s" "$patched" | py_get "data.get('status','')")"
if [[ "$patched_status" == "In Progress" ]]; then
  pass "PATCH /indicators/{id}/ updated status -> In Progress"
else
  fail "PATCH /indicators/{id}/ did not update status (got '$patched_status')"
  exit 1
fi

# 4) Quick log -> Compliant
quick_logged="$(curl -fsS -X POST "$API_URL/indicators/$first_indicator_id/quick_log/")"
ql_status="$(printf "%s" "$quick_logged" | py_get "data.get('status','')")"
ql_last_updated="$(printf "%s" "$quick_logged" | py_get "data.get('lastUpdated')")"
if [[ "$ql_status" == "Compliant" && "$ql_last_updated" != "None" ]]; then
  pass "POST /indicators/{id}/quick_log/ sets status=Compliant and lastUpdated"
else
  fail "quick_log failed (status='$ql_status' lastUpdated='$ql_last_updated')"
  exit 1
fi

# 5) Evidence (note)
evidence_note="$(http_json POST "$API_URL/evidence/" "{\"indicator\":\"$first_indicator_id\",\"type\":\"note\",\"fileName\":\"Audit Note\",\"content\":\"Automated audit evidence note\"}")"
evidence_note_id="$(printf "%s" "$evidence_note" | py_get "data.get('id','')")"
if [[ -n "$evidence_note_id" ]]; then
  pass "POST /evidence/ created note evidence id=$evidence_note_id"
else
  fail "Failed to create note evidence"
  exit 1
fi

# 6) Evidence (file upload)
tmpfile="$(mktemp)"
echo "audit file $(date -u)" > "$tmpfile"
evidence_file_resp="$(curl -fsS -X POST "$API_URL/evidence/" \
  -F "indicator=$first_indicator_id" \
  -F "type=document" \
  -F "file=@$tmpfile;filename=audit.txt")"
rm -f "$tmpfile"

evidence_file_id="$(printf "%s" "$evidence_file_resp" | py_get "data.get('id','')")"
evidence_file_url="$(printf "%s" "$evidence_file_resp" | py_get "data.get('fileUrl','')")"
if [[ -n "$evidence_file_id" && "$evidence_file_url" == /media/* ]]; then
  pass "POST /evidence/ file upload ok id=$evidence_file_id url=$evidence_file_url"
else
  fail "File upload evidence failed or returned unexpected fileUrl (id='$evidence_file_id', url='$evidence_file_url')"
  exit 1
fi

# 7) Media fetch via nginx (/media/* -> /api/media/*)
if curl -fsS "$BASE_URL$evidence_file_url" >/dev/null 2>&1; then
  pass "GET $evidence_file_url returned file content"
else
  fail "GET $evidence_file_url failed (media serving broken)"
  exit 1
fi

# 8) Delete evidence
curl -fsS -X DELETE "$API_URL/evidence/$evidence_note_id/" >/dev/null
curl -fsS -X DELETE "$API_URL/evidence/$evidence_file_id/" >/dev/null
pass "DELETE /evidence/{id}/ removed note+file evidence"

append ""
append "### AI endpoints (may return fallback if GEMINI_API_KEY not set)"

subset="$(printf "%s" "$indicators_json" | python3 - <<'PY'
import json,sys
d=json.load(sys.stdin)
print(json.dumps({"indicators": d[:3]}))
PY
)"

if http_json POST "$API_URL/analyze-checklist/" "$subset" >/dev/null 2>&1; then
  pass "POST /analyze-checklist/ OK"
else
  fail "POST /analyze-checklist/ failed"
fi

if http_json POST "$API_URL/analyze-categorization/" "$subset" >/dev/null 2>&1; then
  pass "POST /analyze-categorization/ OK"
else
  fail "POST /analyze-categorization/ failed"
fi

if http_json POST "$API_URL/ask-assistant/" '{"query":"Summarize key risks for this checklist."}' >/dev/null 2>&1; then
  pass "POST /ask-assistant/ OK"
else
  fail "POST /ask-assistant/ failed"
fi

if http_json POST "$API_URL/report-summary/" "$subset" >/dev/null 2>&1; then
  pass "POST /report-summary/ OK"
else
  fail "POST /report-summary/ failed"
fi

if http_json POST "$API_URL/convert-document/" '{"document_text":"Section: Safety\\n- Maintain spill kit SOP\\n"}' >/dev/null 2>&1; then
  pass "POST /convert-document/ OK"
else
  fail "POST /convert-document/ failed"
fi

if http_json POST "$API_URL/compliance-guide/" '{"indicator":{"section":"Safety","standard":"SAF-001","indicator":"Spill kit SOP","description":"Maintain spill response SOP","frequency":"One-time"}}' >/dev/null 2>&1; then
  pass "POST /compliance-guide/ OK"
else
  fail "POST /compliance-guide/ failed"
fi

if http_json POST "$API_URL/analyze-tasks/" "$subset" >/dev/null 2>&1; then
  pass "POST /analyze-tasks/ OK"
else
  fail "POST /analyze-tasks/ failed"
fi

append ""
append "### Manual UI checklist (open in browser)"
append "- **Projects**: verify imported '$PROJECT_NAME' appears and can be opened."
append "- **Dashboard**: charts render; compliance score updates after marking items compliant."
append "- **Checklist**: search/filter tabs work; expand an indicator; change status; bulk approve; add evidence; open evidence link."
append "- **Upcoming Tasks**: add a recurring frequency to one indicator (PATCH) then verify it shows due/overdue logic."
append "- **Document Library**: evidence shows under correct section folder; delete evidence works."
append "- **Reports**: generate AI summary (fallback ok), export PDF downloads."
append "- **AI Assistant**: send a question; response appears (fallback ok without GEMINI_API_KEY)."
append "- **Converter**: paste text; convert to CSV; import as new project."

append ""
append "### Service URLs"
append "- **App**: $BASE_URL/"
append "- **API Health**: $API_URL/health/"
append "- **Admin**: $BASE_URL/admin/ (user=$ADMIN_USER)"

append ""
append "### Logs (if something fails)"
append "- Run: \`$DC logs --tail=200 backend nginx frontend db\`"

echo "Wrote $report"
echo "Done. App at: $BASE_URL/"


