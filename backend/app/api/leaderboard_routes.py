from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from ..auth import get_current_user
from ..db.database import get_db
from ..db.models import SolveTime, User

router = APIRouter()


class SolveSubmission(BaseModel):
    seconds: float = Field(gt=0, lt=3600)
    scramble: str = ""


@router.post("/times")
def submit_time(
    submission: SolveSubmission,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = SolveTime(
        user_id=user.id,
        seconds=submission.seconds,
        scramble=submission.scramble[:200],
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "username": user.username, "seconds": row.seconds}


@router.get("/leaderboard")
def get_leaderboard(limit: int = 20, db: Session = Depends(get_db)):
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=400, detail="limit must be 1-100")
    rows = (
        db.query(SolveTime)
        .options(joinedload(SolveTime.user))
        .order_by(SolveTime.seconds.asc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": r.id,
            "username": r.user.username if r.user else "(deleted)",
            "user_id": r.user_id,
            "seconds": r.seconds,
            "scramble": r.scramble,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]