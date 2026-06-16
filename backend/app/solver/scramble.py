import random

from .cube_model import apply_moves, SOLVED

OPPOSITE = {"U": "D", "D": "U", "R": "L", "L": "R", "F": "B", "B": "F"}
SUFFIXES = ("", "'", "2")


def random_scramble(length=20):
    moves = []
    prev_face = None
    prev_prev_face = None
    for _ in range(length):
        while True:
            face = random.choice("URFDLB")
            if face == prev_face:
                continue
            if face == prev_prev_face and prev_face == OPPOSITE[face]:
                continue
            break
        moves.append(face + random.choice(SUFFIXES))
        prev_prev_face = prev_face
        prev_face = face
    return moves


def random_state():
    s = random_scramble()
    return s, apply_moves(SOLVED, s)