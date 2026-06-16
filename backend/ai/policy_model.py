"""
policy_model.py — Shared model definition + facelet encoding.

Both train_policy.py and race_routes.py import from here so the
architecture never drifts between train and inference time.
"""

import torch
import torch.nn as nn

FACES = "URFDLB"
FACE_TO_IDX = {c: i for i, c in enumerate(FACES)}

MOVES = [f + s for f in "URFDLB" for s in ("", "'", "2")]
MOVE_TO_IDX = {m: i for i, m in enumerate(MOVES)}
IDX_TO_MOVE = {i: m for m, i in MOVE_TO_IDX.items()}

NUM_MOVES = len(MOVES)        # 18
INPUT_DIM = 54 * 6            # 324 one-hot facelet features


def encode_state(state):
    """54-char facelet string → flat one-hot float tensor of length 324."""
    if len(state) != 54:
        raise ValueError(f"state must be 54 chars, got {len(state)}")
    x = torch.zeros(54, 6, dtype=torch.float32)
    for i, ch in enumerate(state):
        idx = FACE_TO_IDX.get(ch)
        if idx is None:
            raise ValueError(f"invalid facelet char {ch!r} at position {i}")
        x[i, idx] = 1.0
    return x.view(-1)


def encode_batch(states):
    """List of 54-char strings → (N, 324) float tensor."""
    return torch.stack([encode_state(s) for s in states])


class PolicyNet(nn.Module):
    """Small MLP. ~140K params — trains fast on CPU."""

    def __init__(self, input_dim=INPUT_DIM, hidden=256, num_moves=NUM_MOVES):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(hidden, hidden),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(hidden, num_moves),
        )

    def forward(self, x):
        return self.net(x)
