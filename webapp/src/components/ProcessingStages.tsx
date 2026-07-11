import { useEffect, useLayoutEffect, useRef, useState } from "react";

/* ── Tech pills ── */

type TechKind = "butter" | "vision" | "face" | "media";

interface Tech {
  kind: TechKind;
  name: string;
  /** monospace suffix after the divider, e.g. the model id */
  model?: string;
}

function TechIcon({ kind }: { kind: TechKind }) {
  if (kind === "butter") {
    return (
      <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden>
        <rect x="1" y="4" width="14" height="9" rx="2" fill="#fab219" />
        <path d="M1 6.5 L8 1.5 L15 6.5 Z" fill="#ffd77a" />
      </svg>
    );
  }
  if (kind === "vision") {
    return (
      <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden>
        <rect x="2" y="2" width="12" height="12" rx="1.5" fill="none"
          stroke="#3987e5" strokeWidth="1.6" strokeDasharray="3.5 2.2" />
        <circle cx="8" cy="8" r="2" fill="#3987e5" />
      </svg>
    );
  }
  if (kind === "face") {
    return (
      <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden>
        <circle cx="8" cy="8" r="6" fill="none" stroke="#199e70" strokeWidth="1.6" />
        <circle cx="6" cy="7" r="1" fill="#199e70" />
        <circle cx="10" cy="7" r="1" fill="#199e70" />
        <path d="M5.5 10.5c1.6 1.3 3.4 1.3 5 0" fill="none"
          stroke="#199e70" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden>
      <rect x="1.5" y="3" width="13" height="10" rx="1.5" fill="none"
        stroke="#9085e9" strokeWidth="1.5" />
      <path d="M5 3v10M11 3v10" stroke="#9085e9" strokeWidth="1.2" />
    </svg>
  );
}

function TechPill({ tech }: { tech: Tech }) {
  return (
    <span className={`tech-pill ${tech.kind}`}>
      <TechIcon kind={tech.kind} />
      {tech.name}
      {tech.model && <em>{tech.model}</em>}
    </span>
  );
}

/* ── Stages ── */

export interface StageSpec {
  key: string;
  label: string;
  detail: string;
  tech: Tech[];
}

export function buildStages(fileName: string, sizeMb: number, students: number): StageSpec[] {
  return [
    {
      key: "upload",
      label: "Uploading video",
      detail: `${fileName} · ${sizeMb.toFixed(1)} MB`,
      tech: [{ kind: "butter", name: "Butterbase Storage" }],
    },
    {
      key: "roster",
      label: "Loading classroom roster",
      detail: `${students} students · reference photos embedded`,
      tech: [
        { kind: "butter", name: "Butterbase DB" },
        { kind: "face", name: "InsightFace", model: "buffalo_l" },
      ],
    },
    {
      key: "clips",
      label: "Creating student clips",
      detail: "Every student detected, tracked and cropped to their own video",
      tech: [
        { kind: "vision", name: "Ultralytics", model: "YOLO11m" },
        { kind: "media", name: "FFmpeg" },
      ],
    },
    {
      key: "recognize",
      label: "Recognizing students",
      detail: "Face embeddings matched one-to-one against the roster",
      tech: [{ kind: "face", name: "InsightFace", model: "ArcFace 512-d" }],
    },
    {
      key: "analyze",
      label: "Analyzing student behavior",
      detail: "Engagement, phone, sleeping, chatting, looking away — per student",
      tech: [{ kind: "butter", name: "Butterbase AI Gateway", model: "Gemini 2.5 Flash" }],
    },
    {
      key: "reports",
      label: "Generating reports and classroom pulse",
      detail: "Per-student coaching reports · engagement, learning, efficiency and fun for the class",
      tech: [{ kind: "butter", name: "Butterbase AI Gateway", model: "Gemini 2.5 Flash" }],
    },
  ];
}

const FINAL: StageSpec = {
  key: "final",
  label: "Reports are generated.",
  detail: "Every student has a behavior timeline and a personalized report.",
  tech: [],
};

const ITEM_H = 150;    // px — must match .wheel-item height in CSS
const FINAL_H = 260;   // px — must match .wheel-item.final height in CSS
const CENTER = 2;      // active row sits in the 3rd visible slot

interface Props {
  stages: StageSpec[];
  ready: boolean;
  dwellMs?: number;
  onFinished?: () => void;
  /** rendered inside the final chain item (the CTA buttons) */
  finalContent?: React.ReactNode;
}

export default function ProcessingStages({
  stages, ready, dwellMs = 5000, onFinished, finalContent,
}: Props) {
  const items = [...stages, FINAL];
  const finalIndex = items.length - 1;
  const [index, setIndex] = useState(0);
  const [announced, setAnnounced] = useState(false);

  // Center the active card in the wheel, whatever the wheel's actual height is.
  const wheelRef = useRef<HTMLDivElement>(null);
  const [wheelH, setWheelH] = useState(0);
  useLayoutEffect(() => {
    const el = wheelRef.current;
    if (!el) return;
    const measure = () => setWheelH(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (index >= finalIndex) return;                   // final row is terminal
    if (index === finalIndex - 1 && !ready) return;    // hold until the work lands
    const timer = setTimeout(() => setIndex((i) => i + 1), dwellMs);
    return () => clearTimeout(timer);
  }, [index, ready, finalIndex, dwellMs]);

  useEffect(() => {
    if (index === finalIndex && !announced) {
      setAnnounced(true);
      onFinished?.();
    }
  }, [index, finalIndex, announced, onFinished]);

  // put the active card's midline on the wheel's midline (the final card is taller)
  const activeH = index === finalIndex ? FINAL_H : ITEM_H;
  const shift = wheelH
    ? wheelH / 2 - activeH / 2 - index * ITEM_H
    : (CENTER - index) * ITEM_H;

  return (
    <div className="wheel" role="status" aria-live="polite" ref={wheelRef}>
      <div className="wheel-track" style={{ transform: `translateY(${shift}px)` }}>
        {items.map((s, i) => {
          const offset = i - index;
          const state = offset === 0 ? "active" : offset < 0 ? "done" : "pending";
          const isFinal = i === finalIndex;
          return (
            <div
              className={`wheel-item ${state} ${isFinal ? "final" : ""}`}
              key={s.key}
              style={{ "--dist": Math.min(Math.abs(offset), 3) } as React.CSSProperties}
            >
              {!isFinal && (
                <span className="stage-icon">
                  {state === "done" ? "✓" : state === "active" ? <span className="stage-spin" /> : ""}
                </span>
              )}
              <span className="stage-body">
                {isFinal && <span className="final-check">✓</span>}
                <span className="stage-label">{s.label}</span>
                <span className="stage-detail">{s.detail}</span>
                {s.tech.length > 0 && (
                  <span className="tech-row">
                    {s.tech.map((t) => <TechPill key={t.name + (t.model ?? "")} tech={t} />)}
                  </span>
                )}
                {isFinal && state === "active" && finalContent}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
