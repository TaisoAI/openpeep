from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import files, sources, peeps

app = FastAPI(title="OpenPeep", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(files.router, prefix="/api")
app.include_router(sources.router, prefix="/api")
app.include_router(peeps.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "0.1.0"}
