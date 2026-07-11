import { useEffect, useState } from "react";

/** Butterbase mark — shown on the stages that run through their AI gateway. */
function ButterbaseMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
      <rect x="1" y="4" width="14" height="9" rx="2" fill="#fab219" />
      <path d="M1 6.5 L8 1.5 L15 6.5 Z" fill="#ffd77a" />
    </svg>
  );
}

export interface StageSpec {
  key: string;
  label: string;
  detail: string;
  /** shown as a provider chip under the stage */
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

interface Props {
  stages: StageSpec[];
  /** gate completion on real work; pass true when there is nothing to wait for */
  ready: boolean;
  dwellMs?: number;
  onFinished?: () => void;
}

/**
 * Plays the pipeline stages as a timed sequence. The visual pace is fixed so it
 * reads well; the final stage only completes once the real work is `ready`.
 */
export default function ProcessingStages({ stages, ready, dwellMs = 2000, onFinished }: Props) {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (index >= stages.length) return;
    const last = index === stages.length - 1;
    if (last && !ready) return; // hold on the last stage until the work lands
    const timer = setTimeout(() => setIndex((i) => i + 1), dwellMs);
    return () => clearTimeout(timer);
  }, [index, ready, stages.length, dwellMs]);

  useEffect(() => {
    if (index >= stages.length && !done) {
      setDone(true);
      onFinished?.();
    }
  }, [index, stages.length, done, onFinished]);

  return (
    <div className="stages">
      {stages.map((s, i) => {
        const state = i < index ? "done" : i === index ? "active" : "pending";
        return (
          <div className={`stage ${state}`} key={s.key}>
            <span className="stage-icon">
              {state === "done" ? "✓" : state === "active" ? <span className="stage-spin" /> : ""}
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

      <div className={`stage final ${done ? "done" : "pending"}`}>
        <span className="stage-icon">{done ? "✓" : ""}</span>
        <span className="stage-body">
          <span className="stage-label">
            {done ? "Reports are generated." : "Finishing up…"}
          </span>
          <span className="stage-detail">
            {done
              ? "Every student has a clip, a behavior timeline and a personalized report."
              : "Writing results to Butterbase"}
          </span>
        </span>
      </div>
    </div>
  );
}
