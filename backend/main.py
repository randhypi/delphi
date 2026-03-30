from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from services import db
from routers import overview, analytics, transactions, terminals, query, upload, saved_queries, productivity


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: register data tables if files exist
    db.register_tables()
    yield
    # Shutdown: nothing needed, DuckDB in-memory closes automatically


app = FastAPI(
    title="DELPHI API",
    description="Analytics dashboard API for C-Level executives",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://delphi.randhypi.com",
        "http://localhost:3000",
        "http://localhost:3004",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(overview.router, prefix="/api", tags=["Overview"])
app.include_router(analytics.router, prefix="/api", tags=["Analytics"])
app.include_router(transactions.router, prefix="/api", tags=["Transactions"])
app.include_router(terminals.router, prefix="/api", tags=["Terminals"])
app.include_router(query.router, prefix="/api", tags=["Query"])
app.include_router(saved_queries.router, prefix="/api", tags=["Saved Queries"])
app.include_router(productivity.router, prefix="/api", tags=["Productivity"])
app.include_router(upload.router, prefix="/api", tags=["Upload"])


@app.get("/", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "data_loaded": db.is_data_loaded(),
        "docs": "/docs",
    }
