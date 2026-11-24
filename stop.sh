#!/usr/bin/env bash
echo "Stopping ClipForge AI services…"
pkill -f "uvicorn app.main:app" 2>/dev/null && echo "  API stopped" || echo "  API not running"
pkill -f "celery -A app.workers" 2>/dev/null && echo "  Celery stopped" || echo "  Celery not running"
pkill -f "vite" 2>/dev/null && echo "  Frontend stopped" || echo "  Frontend not running"
echo "Done."
