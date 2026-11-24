#!/usr/bin/env bash
# ClipForge AI — Start all services
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$PROJECT_ROOT/venv"
BACKEND="$PROJECT_ROOT/backend"
FRONTEND="$PROJECT_ROOT/frontend"

echo "=================================="
echo " ClipForge AI — Starting Services"
echo "=================================="

# 1. Redis
echo ""
echo "[1/4] Starting Redis…"
if ! pgrep -x redis-server > /dev/null; then
  redis-server --daemonize yes --logfile /tmp/clipforge-redis.log
  sleep 1
  echo "      Redis started."
else
  echo "      Redis already running."
fi

# 2. Backend
echo ""
echo "[2/4] Starting FastAPI backend (port 8000)…"
cd "$BACKEND"
if [ ! -f .env ]; then
  echo "      .env not found — copying from .env.example"
  cp .env.example .env
  echo "      ⚠  Edit $BACKEND/.env and add your ANTHROPIC_API_KEY"
fi
"$VENV/bin/uvicorn" app.main:app --host 0.0.0.0 --port 8000 --reload \
  --log-level info > /tmp/clipforge-api.log 2>&1 &
API_PID=$!
echo "      FastAPI PID: $API_PID (logs: /tmp/clipforge-api.log)"

# 3. Celery worker
echo ""
echo "[3/4] Starting Celery worker…"
cd "$BACKEND"
"$VENV/bin/celery" -A app.workers.celery_app worker \
  --loglevel=info --concurrency=2 \
  --logfile=/tmp/clipforge-celery.log &
CELERY_PID=$!
echo "      Celery PID: $CELERY_PID (logs: /tmp/clipforge-celery.log)"

# 4. Frontend
echo ""
echo "[4/4] Starting Vite dev server (port 5173)…"
cd "$FRONTEND"
npm run dev > /tmp/clipforge-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "      Frontend PID: $FRONTEND_PID (logs: /tmp/clipforge-frontend.log)"

echo ""
echo "=================================="
echo " All services started!"
echo ""
echo "  Frontend:  http://localhost:5173"
echo "  API:       http://localhost:8000"
echo "  API Docs:  http://localhost:8000/docs"
echo "  Health:    http://localhost:8000/health"
echo ""
echo "  PIDs: API=$API_PID  Celery=$CELERY_PID  Frontend=$FRONTEND_PID"
echo "=================================="
echo ""
echo "Press Ctrl+C to stop all services."
echo ""

# Wait and cleanup on exit
trap "echo ''; echo 'Stopping services…'; kill $API_PID $CELERY_PID $FRONTEND_PID 2>/dev/null; pkill -f 'redis-server' 2>/dev/null; echo 'Done.'" EXIT INT TERM
wait $API_PID
