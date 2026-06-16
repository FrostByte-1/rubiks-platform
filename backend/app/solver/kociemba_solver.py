import re
import kociemba
from .cube_model import SOLVED, apply_moves, is_solved

VALID_MOVES = {f + s for f in "URFDLB" for s in ("", "'", "2")}


def _sanitize(raw):
    if not raw:
        return []
    tokens = re.sub(r"\s+", " ", str(raw)).strip().split(" ")
    out = []
    for t in tokens:
        t = t.strip()
        if not t:
            continue
        if t not in VALID_MOVES:
            raise RuntimeError(f"unrecognized token from solver: {t!r}")
        out.append(t)
    return _collapse(out)


def _collapse(moves):
    changed = True
    while changed:
        changed = False
        i = 0
        out = []
        while i < len(moves):
            if i + 1 < len(moves) and moves[i][0] == moves[i + 1][0]:
                a, b = moves[i], moves[i + 1]
                ta = 3 if a.endswith("'") else 2 if a.endswith("2") else 1
                tb = 3 if b.endswith("'") else 2 if b.endswith("2") else 1
                total = (ta + tb) % 4
                if total == 0:
                    i += 2
                    changed = True
                    continue
                face = a[0]
                merged = face if total == 1 else face + "2" if total == 2 else face + "'"
                out.append(merged)
                i += 2
                changed = True
                continue
            out.append(moves[i])
            i += 1
        moves = out
    return moves


def solve(state):
    if len(state) != 54:
        raise ValueError(f"state must be 54 chars, got {len(state)}")

    if state == SOLVED:
        return []

    try:
        raw = kociemba.solve(state)
    except Exception as e:
        raise ValueError(f"could not solve state: {e}")

    moves = _sanitize(raw)
    if not is_solved(apply_moves(state, moves)):
        raise RuntimeError("solver returned moves that do not solve the cube")
    return moves


if __name__ == "__main__":
    print("solved →", solve(SOLVED))
    from .scramble import random_scramble
    sc = random_scramble(20)
    print("scramble:", " ".join(sc))
    sol = solve(apply_moves(SOLVED, sc))
    print(f"solution ({len(sol)}):", " ".join(sol))