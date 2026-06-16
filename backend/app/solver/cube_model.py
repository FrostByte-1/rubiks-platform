SOLVED = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"

MOVE_CYCLES_CW = {
    "U": [
        (0, 2, 8, 6),
        (1, 5, 7, 3),
        (18, 36, 45, 9),
        (19, 37, 46, 10),
        (20, 38, 47, 11),
    ],
    "R": [
        (9, 11, 17, 15),
        (10, 14, 16, 12),
        (20, 2, 51, 29),
        (23, 5, 48, 32),
        (26, 8, 45, 35),
    ],
    "F": [
        (18, 20, 26, 24),
        (19, 23, 25, 21),
        (6, 9, 29, 44),
        (7, 12, 28, 41),
        (8, 15, 27, 38),
    ],
    "D": [
        (27, 29, 35, 33),
        (28, 32, 34, 30),
        (24, 15, 51, 42),
        (25, 16, 52, 43),
        (26, 17, 53, 44),
    ],
    "L": [
        (36, 38, 44, 42),
        (37, 41, 43, 39),
        (0, 18, 27, 53),
        (3, 21, 30, 50),
        (6, 24, 33, 47),
    ],
    "B": [
        (45, 47, 53, 51),
        (46, 50, 52, 48),
        (0, 42, 35, 11),
        (1, 39, 34, 14),
        (2, 36, 33, 17),
    ],
}

ALL_MOVES = [f + suf for f in "URFDLB" for suf in ("", "'", "2")]


def _apply_cycle(state_list, cycle):
    last = state_list[cycle[-1]]
    for i in range(len(cycle) - 1, 0, -1):
        state_list[cycle[i]] = state_list[cycle[i - 1]]
    state_list[cycle[0]] = last


def apply_move(state, move):
    if len(state) != 54:
        raise ValueError(f"state must be 54 chars, got {len(state)}")

    if move.endswith("'"):
        face, turns = move[0], 3
    elif move.endswith("2"):
        face, turns = move[0], 2
    else:
        face, turns = move, 1

    if face not in MOVE_CYCLES_CW:
        raise ValueError(f"unknown move: {move!r}")

    s = list(state)
    for _ in range(turns):
        for cyc in MOVE_CYCLES_CW[face]:
            _apply_cycle(s, cyc)
    return "".join(s)


def apply_moves(state, moves):
    if isinstance(moves, str):
        moves = moves.split()
    for m in moves:
        state = apply_move(state, m)
    return state


def is_solved(state):
    for face_start in range(0, 54, 9):
        center = state[face_start + 4]
        for i in range(9):
            if state[face_start + i] != center:
                return False
    return True


def invert_moves(moves):
    if isinstance(moves, str):
        moves = moves.split()
    out = []
    for m in reversed(moves):
        if m.endswith("'"):
            out.append(m[0])
        elif m.endswith("2"):
            out.append(m)
        else:
            out.append(m + "'")
    return out