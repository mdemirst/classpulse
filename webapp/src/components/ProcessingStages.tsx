import { useEffect, useState } from "react";

/** Butterbase mark — shown on the stages that run through their AI gateway. */
function ButterbaseMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden>
      <rect x="1" y="4" width="14" height="9" rx="2" fill="#fab219" />
      <path d="M1 6.5 L8 1.5 L15 6.5 Z" fill="#ffd77a" />
    </svg>
  );
}

export interface StageSpec {
  key: string;
  label: string;
  detail: string;
  badge?: { model: string };
}

export function buildStages(fileName: string, sizeMb: number, students: number): StageSpec[] {
  return [
    { key: "upload", label: "Uploading video",
      detail: `${fileName} · ${sizeMb.toFixed(1)} MB → Butterbase storage` },
    { key: "roster", label: "Loading classroom roster",
      detail: `${students} students · face embeddings prepared` },
    { key: "clips", label: "Creating student clips",
      detail: "YOLO detection + overlap tracking · cropping each student" },
    { key: "recognize", label: "Recognizing students",
      detail: "InsightFace embeddings matched against the roster" },
    { key: "analyze", label: "Analyzing student behavior",
      detail: "Engagement, distraction, phone, sleeping, chatting — per student",
      badge: { model: "Gemini 2.5 Flash" } },
    { key: "reports", label: "Generating personalized reports",
      detail: "Timestamped evidence, summary and a coaching suggestion per student",
      badge: { model: "Gemini 2.5 Flash" } },
    { key: "pulse", label: "Generating classroom pulse",
      detail: "Engagement · learning · efficiency · fun — aggregated across the class" },
  ];
}

const FINAL: StageSpec = {
  key: "final",
  label: "Reports are generated.",
  detail: "Every student has a clip, a behavior timeline and a personalized report.",
};

const ITEM_H = 118;   // px, must match .wheel-item height in CSS
const CENTER = 2;     // active row sits in the 3rd visible slot

interface Props {
  stages: StageSpec[];
  /** gate the last step on the real work; true when there is nothing to wait for */
  ready: boolean;
  dwellMs?: number;
  onFinished?: () => void;
}

export default function ProcessingStages({ stages, ready, dwellMs = 2000, onFinished }: Props) {
  const items = [...stages, FINAL];
  const finalIndex = items.length - 1;
  const [index, setIndex] = useState(0);
  const [announced, setAnnounced] = useState(false);

  useEffect(() => {
    if (index >= finalIndex) return;                       // final row is terminal
    if (index === finalIndex - 1 && !ready) return;        // hold until work lands
    const timer = setTimeout(() => setIndex((i) => i + 1), dwellMs);
    return () => clearTimeout(timer);
  }, [index, ready, finalIndex, dwellMs]);

  useEffect(() => {
    if (index === finalIndex && !announced) {
      setAnnounced(true);
      onFinished?.();
    }
  }, [index, finalIndex, announced, onFinished]);

  return (
    <div className="wheel" role="status" aria-live="polite">
      <div
        className="wheel-track"
        style={{ transform: `translateY(${(CENTER - index) * ITEM_H}px)` }}
      >
        {items.map((s, i) => {
          const offset = i - index;
          const state =
            offset === 0 ? "active" : offset < 0 ? "done" : "pending";
          const isFinal = i === finalIndex;
          return (
            <div
              className={`wheel-item ${state} ${isFinal ? "final" : ""}`}
              key={s.key}
              style={{ "--dist": Math.min(Math.abs(offset), 3) } as React.CSSProperties}
            >
              <span className="stage-icon">
                {state === "done" || (isFinal && state === "active") ? "✓"
                  : state === "active" ? <span className="stage-spin" />
                  : ""}
              </span>
              <span className="stage-body">
                <span className="stage-label">{s.label}</span>
                <span className="stage-detail">{s.detail}</span>
                {s.badge && (
                  <span className="stage-badge">
                    <ButterbaseMark />
                    Butterbase AI Gateway
                    <em>{s.badge.model}</em>
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
