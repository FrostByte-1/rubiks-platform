FACE_ORDER = ["U", "R", "F", "D", "L", "B"]


def assemble_state(faces_dict):
    if set(faces_dict.keys()) != set(FACE_ORDER):
        raise ValueError(f"faces_dict must have exactly keys {FACE_ORDER}")
    parts = []
    for face in FACE_ORDER:
        colors = faces_dict[face]
        if len(colors) != 9:
            raise ValueError(f"face {face} must have 9 colors, got {len(colors)}")
        parts.append("".join(colors))
    return "".join(parts)


def validate_state(state):
    if len(state) != 54:
        raise ValueError(f"state must be 54 chars, got {len(state)}")
    for face in FACE_ORDER:
        count = state.count(face)
        if count != 9:
            raise ValueError(f"color {face} appears {count} times, expected 9")
    for i, face in enumerate(FACE_ORDER):
        center_idx = i * 9 + 4
        if state[center_idx] != face:
            raise ValueError(f"center of face {face} should be {face}, got {state[center_idx]}")
    return True