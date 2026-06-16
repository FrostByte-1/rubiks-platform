from typing import Dict, List, Literal

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from pydantic import BaseModel

from ..solver import kociemba_solver
from ..solver import scramble as scramble_mod
from ..vision import color_detection, cube_state

router = APIRouter()


class FacesPayload(BaseModel):
    faces: Dict[str, List[str]]


class StatePayload(BaseModel):
    state: str


def _solve_with_mode(state: str):
    cube_state.validate_state(state)
    if state == "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB":
        return {"mode": "quick", "state": state, "moves": [], "count": 0, "solution": "", "already_solved": True}
    moves = kociemba_solver.solve(state)
    return {
        "mode": "quick",
        "state": state,
        "moves": moves,
        "count": len(moves),
        "solution": " ".join(moves),
    }


@router.get("/scramble")
def get_scramble(length: int = 20):
    moves = scramble_mod.random_scramble(length)
    return {"scramble": " ".join(moves), "moves": moves}


@router.post("/solve")
def solve_from_faces(
    payload: FacesPayload,
):
    try:
        state = cube_state.assemble_state(payload.faces)
        return _solve_with_mode(state)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/solve_state")
def solve_from_state(
    payload: StatePayload,
):
    try:
        return _solve_with_mode(payload.state)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/detect")
async def detect_face(face: str, image: UploadFile = File(...)):
    if face not in ("U", "R", "F", "D", "L", "B"):
        raise HTTPException(status_code=400, detail="face must be one of U R F D L B")
    contents = await image.read()
    try:
        colors = color_detection.detect_face_from_bytes(contents)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"could not read image: {e}")
    return {"face": face, "colors": colors}