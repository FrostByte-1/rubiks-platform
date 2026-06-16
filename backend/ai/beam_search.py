import torch

from app.solver.cube_model import SOLVED, apply_move, is_solved
from policy_model import IDX_TO_MOVE, encode_state


def _is_inverse(a, b):
    if not a or not b or a[0] != b[0]:
        return False
    sa = a[1:] if len(a) > 1 else ""
    sb = b[1:] if len(b) > 1 else ""
    return {sa, sb} == {"", "'"}


def _solved_score(state):
    """Higher = closer to solved. Counts stickers matching their face center."""
    score = 0
    for f in range(6):
        base = f * 9
        center = state[base + 4]
        for i in range(9):
            if state[base + i] == center:
                score += 1
    return score


def beam_search(model, start_state, beam_width=8, max_depth=40, top_k=4):
    """Returns (moves, solved_bool, best_partial_moves).
    - If a beam reaches solved, returns (moves, True, moves).
    - Otherwise returns ([], False, best_partial) where best_partial is the
      move list of the beam that got closest to solved.
    """
    if is_solved(start_state):
        return [], True, []

    # each beam: (state, moves, visited_set, last_move)
    beams = [(start_state, [], {start_state}, None)]
    best_partial = []
    best_score = _solved_score(start_state)

    with torch.no_grad():
        for _ in range(max_depth):
            scored_children = []
            for state, moves, visited, last in beams:
                x = encode_state(state).unsqueeze(0)
                logits = model(x)[0]
                order = torch.argsort(logits, descending=True).tolist()[:top_k]
                for idx in order:
                    mv = IDX_TO_MOVE[idx]
                    if last and _is_inverse(mv, last):
                        continue
                    nxt = apply_move(state, mv)
                    if nxt in visited:
                        continue
                    sc = _solved_score(nxt)
                    scored_children.append((sc, nxt, moves + [mv], visited | {nxt}, mv))

            if not scored_children:
                break

            # check for solve
            for sc, nxt, mvs, vis, lm in scored_children:
                if is_solved(nxt):
                    return mvs, True, mvs

            # keep best beam_width children by score
            scored_children.sort(key=lambda t: t[0], reverse=True)
            scored_children = scored_children[:beam_width]
            beams = [(nxt, mvs, vis, lm) for (_, nxt, mvs, vis, lm) in scored_children]

            # track best partial seen
            top = scored_children[0]
            if top[0] > best_score:
                best_score = top[0]
                best_partial = top[2]

    return [], False, best_partial
