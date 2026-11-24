from fastapi import APIRouter, HTTPException
from celery.result import AsyncResult
from app.workers.celery_app import celery_app

router = APIRouter()


@router.get("/{job_id}")
def get_job_status(job_id: str):
    try:
        result = AsyncResult(job_id, app=celery_app)
        status_map = {
            "PENDING": "pending",
            "STARTED": "running",
            "SUCCESS": "completed",
            "FAILURE": "failed",
            "RETRY": "running",
            "REVOKED": "failed",
        }
        return {
            "job_id": job_id,
            "status": status_map.get(result.status, "pending"),
            "progress": 0,
            "message": str(result.info) if result.info else "",
            "result": result.result if result.successful() else None,
            "error": str(result.result) if result.failed() else None,
        }
    except Exception as exc:
        raise HTTPException(503, f"Could not retrieve job status: {exc}")
