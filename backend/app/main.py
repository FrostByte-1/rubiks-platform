from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import auth_routes, leaderboard_routes, solve_routes, race_routes
from .db.database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Rubik's Cube Platform API")

import re
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.cors import CORSMiddleware as StarletteCORS

# List your exact known origins, plus handle Vercel preview URLs
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://rubiks-platform-git-main-nirupams-projects-88829487.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://rubiks-platform.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(solve_routes.router, tags=["solve"])
app.include_router(leaderboard_routes.router, tags=["leaderboard"])
app.include_router(race_routes.router)


@app.get("/health")
def health():
    return {"status": "ok"}