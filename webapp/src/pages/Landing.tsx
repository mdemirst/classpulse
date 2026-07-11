import { useEffect } from "react";
import { Link } from "react-router-dom";

function IconInsights() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="7" cy="6" r="2.6" stroke="#3987e5" strokeWidth="1.6" />
      <path d="M2.5 16c0-2.5 2-4.2 4.5-4.2S11.5 13.5 11.5 16" stroke="#3987e5" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14 5.2a2.4 2.4 0 0 1 0 4.6M15.5 16c0-1.9-.7-3.2-1.8-4" stroke="#3987e5" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconFeedback() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M3 14.5 7.5 9l3 2.6L17 5" stroke="#ec835a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.6 5h4.4v4.4" stroke="#ec835a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconOutcomes() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="6.5" cy="6" r="2.4" stroke="#0ca30c" strokeWidth="1.6" />
      <path d="M2.5 16c0-2.3 1.8-3.9 4-3.9s4 1.6 4 3.9" stroke="#0ca30c" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M13.5 11.5v-3l3-1.5 3 1.5v3" stroke="#0ca30c" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 1.5 13.5 3.5v4C13.5 11 11 13.6 8 14.5 5 13.6 2.5 11 2.5 7.5v-4L8 1.5Z"
        stroke="#8a897f" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M5.8 8.1 7.3 9.6l3-3.2" stroke="#8a897f" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const STATS = [
  { value: "6/6", label: "Students tracked", accent: "#3987e5" },
  { value: "8", label: "Behaviors detected", accent: "#0ca30c" },
  { value: "<2 min", label: "Per lesson analyzed", accent: "#fab219" },
  { value: "0", label: "Videos stored", accent: "#9085e9" },
];

export default function Landing() {
  // the hero owns the whole viewport — no page scroll behind it
  useEffect(() => {
    document.body.classList.add("no-scroll");
    return () => document.body.classList.remove("no-scroll");
  }, []);

  return (
    <div className="landing-photo">
      <div className="landing-photo-tint" aria-hidden />
      <div className="landing-photo-dots" aria-hidden />

      <div className="landing-photo-inner">
        <h1 className="landing-photo-title">
          Every lesson,
          <br />
          <span className="accent">understood.</span>
        </h1>

        <p className="landing-photo-sub">
          Intelligent AI that understands what happens in class, what it means for
          every student, and how teachers can improve every day.
        </p>

        <ul className="landing-features">
          <li><IconInsights /> Deep in-class student insights</li>
          <li><IconFeedback /> Actionable coaching for teachers</li>
          <li><IconOutcomes /> Better outcomes for every learner</li>
        </ul>

        <Link to="/upload" className="landing-photo-cta">
          See ClassPulse in action
        </Link>

        <div className="landing-privacy">
          <IconShield /> Privacy-first. Videos are analyzed, never stored.
        </div>
      </div>

      <div className="landing-stats">
        {STATS.map((s) => (
          <div className="landing-stat" key={s.label}>
            <div className="landing-stat-value" style={{ color: s.accent }}>{s.value}</div>
            <div className="landing-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
