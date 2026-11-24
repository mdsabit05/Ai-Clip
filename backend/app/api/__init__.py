from fastapi import APIRouter
from app.api.routes import projects, clips, jobs, files

router = APIRouter()
router.include_router(projects.router, prefix="/projects", tags=["projects"])
router.include_router(clips.router, prefix="/clips", tags=["clips"])
router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
router.include_router(files.router, prefix="/files", tags=["files"])
