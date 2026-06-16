import os
import sys

import torch
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..solver.cube_model import SOLVED, apply_moves, is_solved
from ..solver import kociemba_solver
from ..vision.cube_state import validate_state

AI_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ai"))
if AI_DIR not in sys.path:
    sys.path.insert(0, AI_DIR)

from policy_model import PolicyNet  # noqa: E402
from beam_search import beam_search  # noqa: E402

router = APIRouter(prefix="/race", tags=["race"])

MODEL_PATH = os.path.join(AI_DIR, "model.pth")
BEAM_WIDTH = 8
MAX_DEPTH = 40

_model = None


def _load_model():
    global _model
    if _model is not None:
        return _model
    if not os.path.exists(MODEL_PATH):
        return None
    ckpt = torch.load(MODEL_PATH, map_location="cpu")
    m = PolicyNet(input_dim=ckpt.get("input_dim", 324), num_moves=ckpt.get("num_moves", 18))
    m.load_state_dict(ckpt["state_dict"])
    m.eval()
    _model = m
    return _model


class RacePayload(BaseModel):
    state: str


@router.post("/solve")
def race_solve(payload: RacePayload):
    state = payload.state
    try:
        validate_state(state)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if state == SOLVED:
        return {"moves": [], "count": 0, "neural_len": 0, "solver_path": "already_solved"}

    model = _load_model()

    if model is None:
        try:
            moves = kociemba_solver.solve(state)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
        return {"moves": moves, "count": len(moves), "neural_len": 0, "solver_path": "oracle"}

    # 1. Try a full self-solve via beam search.
    full, solved, best_partial = beam_search(
        model, state, beam_width=BEAM_WIDTH, max_depth=MAX_DEPTH
    )
    if solved and is_solved(apply_moves(state, full)):
        return {
            "moves": full,
            "count": len(full),
            "neural_len": len(full),
            "solver_path": "neural",
        }

    # 2. Machine stalled. Continue in real time from the best partial state with Kociemba.
    neural_prefix = best_partial
    mid_state = apply_moves(state, neural_prefix)
    if is_solved(mid_state):
        return {
            "moves": neural_prefix,
            "count": len(neural_prefix),
            "neural_len": len(neural_prefix),
            "solver_path": "neural",
        }
    try:
        tail = kociemba_solver.solve(mid_state)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"oracle continuation failed: {e}")

    full_moves = neural_prefix + tail
    if not is_solved(apply_moves(state, full_moves)):
        raise HTTPException(status_code=500, detail="combined solution does not solve the cube")

    return {
        "moves": full_moves,
        "count": len(full_moves),
        "neural_len": len(neural_prefix),
        "solver_path": "neural_then_oracle",
    }
