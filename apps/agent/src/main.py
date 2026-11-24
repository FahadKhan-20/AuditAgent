import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.routes import router as audit_router
from .config import settings

app = FastAPI(
    title="AuditAgent API",
    description="Autonomous Solidity auditor and invariant regression testing engine",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(audit_router)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "AuditAgent", "version": "1.0.0"}

if __name__ == "__main__":
    uvicorn.run("apps.agent.src.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
