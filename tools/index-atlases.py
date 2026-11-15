"""Measure source rectangles/roots without modifying generated image pixels.

Requires Pillow. Run from any working directory. Do not assume generated sheets
have perfectly uniform rows: the female sheet crosses its nominal row boundaries.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DIRECTORY = ROOT / "assets" / "photoreal"
SHEETS = [("player", "player-walk.png", 5), ("male", "male-walk.png", 5),
          ("female", "female-walk.png", 5), ("props", "props.png", 2)]
index = {}
audit = []
for name, filename, rows in SHEETS:
    image = Image.open(DIRECTORY / filename).convert("RGBA")
    alpha = image.getchannel("A").point(lambda value: 255 if value >= 32 else 0)
    columns = []
    for column in range(4):
        left, right = round(column * image.width / 4), round((column + 1) * image.width / 4)
        segment = alpha.crop((left, 0, right, image.height))
        foreground = [segment.crop((0, y, segment.width, y + 1)).getbbox() is not None
                      for y in range(image.height)]
        runs = []
        start = None
        for y, present in enumerate(foreground + [False] * 5):
            if present and start is None:
                start = y
            if start is not None and not any(foreground[y:y + 4]):
                if y - start > image.height / rows * 0.4:
                    runs.append((start, y))
                start = None
        if len(runs) != rows:
            raise ValueError(f"{filename} column {column}: expected {rows} bodies, got {runs}")
        boxes = []
        for top, bottom in runs:
            x0, y0, x1, y1 = segment.crop((0, top, segment.width, bottom)).getbbox()
            boxes.append([left + x0, top + y0, x1 - x0, y1 - y0])
        columns.append(boxes)
    frames = [columns[column][row] for row in range(rows) for column in range(4)]
    anchors = []
    signatures = []
    for frame_id, (x, y, width, height) in enumerate(frames):
        crop = image.crop((x, y, x + width, y + height))
        signature = hashlib.sha256(crop.tobytes()).hexdigest()
        signatures.append(signature)
        points = []
        if name != "props":
            for sy in range(int(height * .02), max(1, int(height * .12))):
                for sx in range(width):
                    if crop.getpixel((sx, sy))[3] >= 32:
                        points.append(sx + .5)
        root = sum(points) / len(points) if points else width / 2
        anchors.append({"x": root, "y": height})
        audit.append({"asset": name, "row": frame_id // 4, "column": frame_id % 4,
                      "sourceRect": [x, y, width, height], "root": anchors[-1],
                      "sourceSHA256": signature})
    if len(set(signatures)) != len(frames):
        raise ValueError(f"Duplicate images in {filename}")
    index[name] = {"file": filename, "columns": 4, "rows": rows, "frames": frames,
                   "anchors": anchors, "referenceHeight": max(frame[3] for frame in frames),
                   "sourceSHA256": hashlib.sha256((DIRECTORY / filename).read_bytes()).hexdigest(), "imageWidth": image.width, "imageHeight": image.height,
                   "poseRows": ["standing", "candidate-1", "candidate-2", "candidate-3", "candidate-4"]
                   if rows == 5 else ["coat", "umbrella-stand"]}
    print(f"{filename}: {len(frames)} nonempty distinct frames; heights "
          f"{min(frame[3] for frame in frames)}–{max(frame[3] for frame in frames)}")
(DIRECTORY / "atlas-index.json").write_text(json.dumps(index, indent=2), encoding="utf8")
(DIRECTORY / "frame-audit.json").write_text(json.dumps({
    "layoutMethod": "alpha segmentation within each direction column; not nominal uniform row cropping",
    "imageFilesUnmodified": True, "frames": audit, "totalNonemptyFrames": len(audit)
}, indent=2), encoding="utf8")
