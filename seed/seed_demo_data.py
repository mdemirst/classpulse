"""Seed student_results + insights demo data into the ClassPulse Butterbase app.

Usage: BUTTERBASE_API_KEY=bb_sk_... python3 seed/seed_demo_data.py
Stdlib only (urllib) so it runs without a venv.
"""
import json
import os
import urllib.request

API = "https://api.butterbase.ai/v1/app_k03t6gua7dg1"
KEY = os.environ["BUTTERBASE_API_KEY"]

CLASS_7A = "1e7ad7b2-3a3f-4f99-8bf4-0a9e4578e2cf"
CLASS_6B = "cb3fd2d6-88a1-4ca4-ae62-92de579f79bd"

# lesson ids in chronological order per classroom
LESSONS_7A = ["74341a65-5386-4b74-ba33-9f80273c857c",
              "712dd3f8-2892-4178-a1b7-56eca19e29c6",
              "e7b25a8d-2d9f-4bea-be07-bfd0db308735"]
LESSONS_6B = ["d78028cc-38f2-4f27-be88-50857248d534",
              "f63826de-01e9-4e33-92ce-207985cba023",
              "4fc456c7-e356-4bc5-b786-93cfadbb875b"]

STUDENTS_7A = {"Maya": "0c8687fd-db88-439b-b876-1326ccf3a4ed",
               "Ali": "548e5efb-1622-4afd-bd06-d82cae11f9f6",
               "Sofia": "c18b3d23-dbe9-440f-ac4c-8c8fe17924fb",
               "Kenji": "9b7bf9c2-15e0-44ee-af1a-b3053d36a7a1",
               "Leo": "6153fb57-4f9d-4d95-a345-2207addcb9c3",
               "Zara": "9f2a0c2b-073f-4978-a2ff-241463c109af"}
STUDENTS_6B = {"Emma": "17fde566-1552-4b39-ad8e-561fe20ce84c",
               "Noah": "c73b6509-f58f-4d16-80fe-d112a668a9e0",
               "Ava": "e13f7c38-f9ad-46d6-8d35-3ba15737a3dc",
               "Ethan": "4dc955bd-b3c9-46fb-9980-68406fb96bf9",
               "Lily": "5f6622d8-c0ee-47ec-a6cf-f10595c3ece5",
               "Omar": "f915c8b9-99e8-4cb0-af39-3361ed15d73b"}

# name -> (scores per lesson, distraction kinds per lesson, suggestion)
# score None = absent that lesson
ARCS_7A = {
    "Maya":  ([90, 88, 92], [[], [], []],
              "Maya thrives on questions — give her stretch problems to keep the ceiling high."),
    "Ali":   ([84, 66, 41], [[], ["phone"], ["phone", "chatting"]],
              "Ali disengages during solo blocks and reaches for his phone — try pairing him up and a mid-lesson check-in."),
    "Sofia": ([75, 72, 70], [[], [], ["phone"]],
              "Sofia stays on task when close to the front — keep current seating."),
    "Kenji": ([82, 85, 80], [[], [], []],
              "Kenji responds well to board work — keep giving him demonstration moments."),
    "Leo":   ([60, 58, 62], [["chatting"], ["chatting"], ["chatting"]],
              "Leo chats with his neighbor during instruction — a seating change may help."),
    "Zara":  ([65, None, 65], [["looking_away"], [], ["looking_away"]],
              "Zara drifts toward the window — a seat away from it could reduce the pull."),
}
ARCS_6B = {
    "Emma":  ([86, 90, 84], [[], [], []],
              "Emma is consistently engaged — consider her as a lab-pair anchor for others."),
    "Noah":  ([74, 80, 68], [[], [], ["looking_away"]],
              "Noah dips during review formats — interactive recall works better for him."),
    "Ava":   ([80, 95, 78], [[], [], []],
              "Ava lights up in hands-on work — channel that into leading demos."),
    "Ethan": ([55, 70, 50], [["asleep"], [], ["asleep"]],
              "Ethan struggled to stay awake twice this week — worth a gentle wellbeing check-in."),
    "Lily":  ([72, 82, 74], [[], [], []],
              "Lily engages steadily — pair her with quieter students in group work."),
    "Omar":  ([60, 76, 85], [["looking_away"], [], []],
              "Omar is on a strong upward trend — acknowledge the improvement to lock it in."),
}

KIND_NOTES = {
    "phone": "Looking at phone held below the desk",
    "chatting": "Talking with neighbor during instruction",
    "looking_away": "Gazing away from the lesson for an extended period",
    "asleep": "Head down on desk, eyes closed",
}


def timeline(score):
    """6-point per-student timeline wobbling around the overall score."""
    deltas = [-6, 2, 8, -3, 4, -5]
    return [{"t": i * 300, "score": max(0, min(100, score + d))}
            for i, d in enumerate(deltas)]


def events(kinds, score):
    out = []
    for i, kind in enumerate(kinds):
        start = 400 + i * 500
        out.append({"t_start": start, "t_end": start + 180, "kind": kind,
                    "note": KIND_NOTES[kind]})
    return out


def summary(name, score, kinds):
    if score >= 85:
        return f"{name} was highly engaged throughout — tracking the lesson, participating, and staying on task."
    if score >= 70:
        return f"{name} was engaged for most of the lesson with brief dips during independent work."
    if score >= 55:
        return (f"{name} was intermittently engaged; "
                + (f"notable {', '.join(kinds)} episodes reduced focus." if kinds else "energy faded in the middle third."))
    return (f"{name} was largely disengaged this lesson"
            + (f" — {', '.join(kinds)} for extended periods." if kinds else "."))


def post(table, row):
    req = urllib.request.Request(
        f"{API}/{table}", data=json.dumps(row).encode(),
        headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
        method="POST")
    with urllib.request.urlopen(req) as r:
        return json.load(r)


def seed_results():
    n = 0
    for lessons, students, arcs in ((LESSONS_7A, STUDENTS_7A, ARCS_7A),
                                    (LESSONS_6B, STUDENTS_6B, ARCS_6B)):
        for name, (scores, kinds_per_lesson, suggestion) in arcs.items():
            for lesson_id, score, kinds in zip(lessons, scores, kinds_per_lesson):
                if score is None:
                    row = {"lesson_id": lesson_id, "student_id": students[name],
                           "present": False, "match_confidence": 0}
                else:
                    row = {
                        "lesson_id": lesson_id, "student_id": students[name],
                        "present": True, "match_confidence": 0.93,
                        "engagement_score": score,
                        "engagement_timeline": {"items": timeline(score)},
                        "distraction_events": {"items": events(kinds, score)},
                        "summary": summary(name, score, kinds),
                        "suggestion": suggestion,
                    }
                post("student_results", row)
                n += 1
    print(f"student_results: {n} rows")


def seed_insights():
    rows = [
        {"scope": "student", "classroom_id": CLASS_7A, "student_id": STUDENTS_7A["Ali"],
         "text": "Ali's engagement has declined three lessons in a row (84 → 66 → 41), with phone distractions increasing. Consider a one-on-one check-in this week.",
         "source": "synthesis"},
        {"scope": "student", "classroom_id": CLASS_7A, "student_id": STUDENTS_7A["Leo"],
         "text": "Leo has been chatting with a neighbor during instruction in all three lessons — a seating change may help.",
         "source": "synthesis"},
        {"scope": "classroom", "classroom_id": CLASS_7A,
         "text": "Solo work blocks correlate with engagement drops in 7-A; group formats lifted the room in every lesson this week.",
         "source": "synthesis"},
        {"scope": "student", "classroom_id": CLASS_6B, "student_id": STUDENTS_6B["Omar"],
         "text": "Omar is on a strong upward trend (60 → 76 → 85). Acknowledging the improvement could help lock it in.",
         "source": "synthesis"},
        {"scope": "student", "classroom_id": CLASS_6B, "student_id": STUDENTS_6B["Ethan"],
         "text": "Ethan fell asleep during two lessons this week — worth a gentle wellbeing check-in.",
         "source": "synthesis"},
        {"scope": "classroom", "classroom_id": CLASS_6B,
         "text": "Hands-on formats scored ~18 points higher engagement than lecture formats in 6-B this week.",
         "source": "synthesis"},
    ]
    for row in rows:
        post("insights", row)
    print(f"insights: {len(rows)} rows")


if __name__ == "__main__":
    seed_results()
    seed_insights()
    print("done")
