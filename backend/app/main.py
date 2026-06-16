from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import auth_routes, leaderboard_routes, solve_routes, race_routes
from .db.database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Rubik's Cube Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://rubiks-platform-iqtbt1mi7-nirupams-projects-88829487.vercel.app",  # replace with your actual Vercel URL
    ],
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