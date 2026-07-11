"""Seed a classroom (with roster photos in Butterbase storage) from a dataset dir.

    BUTTERBASE_API_KEY=bb_sk_... .venv/bin/python seed/seed_classroom.py \
        datasets/simulated/classroom1

Idempotent: re-running updates the existing classroom's roster photos.
"""
import json
import sys
from pathlib import Path

from pipeline import db, storage


def main(classroom_dir: Path) -> None:
    meta = json.loads((classroom_dir / "classroom.json").read_text())

    existing = [c for c in db.select("classrooms") if c["name"] == meta["name"]]
    if existing:
        classroom = existing[0]
        print(f"classroom exists: {classroom['id']}")
    else:
        classroom = db.insert("classrooms", {
            "name": meta["name"],
            "teacher_name": meta.get("teacher_name"),
            "grade": meta.get("grade"),
        })
        print(f"classroom created: {classroom['id']}")

    students = {s["name"]: s for s in db.select("students", f"classroom_id=eq.{classroom['id']}")}
    for entry in meta["roster"]:
        name, photo = entry["name"], classroom_dir / entry["photo"]
        object_id = storage.upload_file(photo, public=True)
        if name in students:
            db.update("students", students[name]["id"], {"roster_photo_object_id": object_id})
            print(f"  updated {name}")
        else:
            db.insert("students", {"classroom_id": classroom["id"], "name": name,
                                   "roster_photo_object_id": object_id})
            print(f"  added {name}")
    print(f"done: {len(meta['roster'])} students with roster photos")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
