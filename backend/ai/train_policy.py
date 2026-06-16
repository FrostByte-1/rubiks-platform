"""
train_policy.py — Generate a dataset from Kociemba solutions, then train
the PolicyNet MLP and save weights to backend/ai/model.pth.

Run from the backend/ directory:
    python ai/train_policy.py

Expect ~3–8 minutes on an i5 CPU. Validation accuracy on shallow scrambles
typically lands 0.55–0.75, which is good enough for the neural path to drive
most early moves; the oracle fallback in race_routes.py finishes the rest.
"""

import os
import random
import sys
import time

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

# ---------------------------------------------------------------------------
# Make sure we can import from the backend/ root (app package) and from
# the ai/ sibling directory (policy_model).
# ---------------------------------------------------------------------------
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_AI_DIR = os.path.dirname(__file__)
for _p in [_BACKEND_DIR, _AI_DIR]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from app.solver.cube_model import SOLVED, apply_move, apply_moves, is_solved  # noqa: E402
from app.solver.scramble import random_scramble                                # noqa: E402
from app.solver import kociemba_solver                                         # noqa: E402

from policy_model import (                                                     # noqa: E402
    INPUT_DIM, NUM_MOVES, MOVE_TO_IDX, PolicyNet, encode_state,
)

MODEL_PATH = os.path.join(_AI_DIR, "model.pth")

# ---------------------------------------------------------------------------
# Training hyper-parameters (tuned for an i5 / 24 GB RAM box, CPU-only).
# ---------------------------------------------------------------------------
NUM_SCRAMBLES = 12_000   # scrambles to generate
MAX_SCRAMBLE_LEN = 8     # shallow scrambles → more learnable policy
EPOCHS = 25
BATCH_SIZE = 256
LR = 1e-3
SEED = 1234


def build_dataset(num_scrambles: int, max_len: int):
    """For each scramble, get Kociemba's solution and record
    (state, next_move) for every intermediate state on the solving path."""
    random.seed(SEED)
    states: list[str] = []
    labels: list[int] = []
    seen: set[str] = set()

    generated = 0
    attempts = 0
    while generated < num_scrambles:
        attempts += 1
        length = random.randint(1, max_len)
        scramble = random_scramble(length)
        state = apply_moves(SOLVED, scramble)
        if is_solved(state):
            continue
        try:
            solution = kociemba_solver.solve(state)
        except Exception:
            continue
        if not solution:
            continue

        cur = state
        for move in solution:
            if cur not in seen:
                seen.add(cur)
                states.append(cur)
                labels.append(MOVE_TO_IDX[move])
            cur = apply_move(cur, move)

        generated += 1
        if generated % 1000 == 0:
            print(
                f"  generated {generated}/{num_scrambles} scrambles "
                f"({len(states):,} state/move pairs so far)"
            )

    print(f"Dataset built: {len(states):,} unique pairs from {attempts} attempts")
    return states, labels


def main() -> None:
    torch.manual_seed(SEED)
    device = torch.device("cpu")
    print(f"Training on {device}")

    t0 = time.time()
    print(f"Building dataset ({NUM_SCRAMBLES} scrambles, max depth {MAX_SCRAMBLE_LEN})…")
    states, labels = build_dataset(NUM_SCRAMBLES, MAX_SCRAMBLE_LEN)

    print("Encoding dataset…")
    X = torch.stack([encode_state(s) for s in states])
    y = torch.tensor(labels, dtype=torch.long)

    # Shuffle and split 90/10 train/val.
    n = X.shape[0]
    perm = torch.randperm(n)
    X, y = X[perm], y[perm]
    split = int(n * 0.9)
    X_train, y_train = X[:split], y[:split]
    X_val,   y_val   = X[split:], y[split:]

    train_loader = DataLoader(
        TensorDataset(X_train, y_train),
        batch_size=BATCH_SIZE,
        shuffle=True,
    )

    model = PolicyNet(input_dim=INPUT_DIM, num_moves=NUM_MOVES).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=LR)
    criterion = nn.CrossEntropyLoss()

    total_params = sum(p.numel() for p in model.parameters())
    print(f"Model parameters: {total_params:,}")
    print(f"Training {len(X_train):,} samples | validating {len(X_val):,} samples\n")

    for epoch in range(1, EPOCHS + 1):
        model.train()
        total_loss = 0.0
        for xb, yb in train_loader:
            xb, yb = xb.to(device), yb.to(device)
            optimizer.zero_grad()
            out = model(xb)
            loss = criterion(out, yb)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * xb.size(0)

        model.eval()
        with torch.no_grad():
            val_out  = model(X_val.to(device))
            val_pred = val_out.argmax(dim=1)
            val_acc  = (val_pred == y_val.to(device)).float().mean().item()

        avg_loss = total_loss / len(X_train)
        print(f"Epoch {epoch:2d}/{EPOCHS}  loss={avg_loss:.4f}  val_acc={val_acc:.3f}")

    torch.save(
        {
            "state_dict": model.state_dict(),
            "input_dim":  INPUT_DIM,
            "num_moves":  NUM_MOVES,
        },
        MODEL_PATH,
    )
    elapsed = time.time() - t0
    print(f"\nSaved model to {MODEL_PATH}  (elapsed {elapsed:.1f}s)")


if __name__ == "__main__":
    main()
