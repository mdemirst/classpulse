import { useMemo, useRef } from "react";
import { fmtTime } from "../api";
import { STATE_COLOR, STATE_LABEL } from "../lib/states";
import type { DistractionEvent, StateSegment } from "../types";

interface Props {
  duration: number;
  currentTime: number;
  states: StateSegment[];
  events: DistractionEvent[];
  onSeek: (t: number) => void;
}

/** Behavior-category band + event markers + playhead. Click anywhere to scrub. */
export default function ClipTimeline({ duration, currentTime, states, events, onSeek }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const span = duration || 1;

  const legend = useMemo(() => {
    const seen = new Map<string, number>();
    states.forEach((s) => {
      seen.set(s.state, (seen.get(s.state) ?? 0) + (s.t_end - s.t_start));
    });
    return [...seen.entries()].sort((a, b) => b[1] - a[1]);
  }, [states]);

  function seekFromEvent(e: React.MouseEvent) {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * span);
  }

  const pct = (t: number) => `${(t / span) * 100}%`;

  return (
    <div className="clip-timeline">
      <div className="clip-timeline-head">
        <span className="sub">Behavior timeline</span>
        <span className="clip-time">{fmtTime(currentTime)} / {fmtTime(span)}</span>
      </div>

      <div className="clip-timeline-bar" ref={barRef} onClick={seekFromEvent} role="slider"
        aria-label="Scrub clip" aria-valuenow={Math.round(currentTime)}
        aria-valuemin={0} aria-valuemax={Math.round(span)} tabIndex={0}>
        {states.length === 0 && <div className="clip-timeline-empty" />}
        {states.map((s, i) => (
          <div
            key={i}
            className="clip-seg"
            title={`${STATE_LABEL[s.state]} · ${fmtTime(s.t_start)}–${fmtTime(s.t_end)}${s.note ? ` — ${s.note}` : ""}`}
            style={{
              left: pct(s.t_start),
              width: pct(Math.max(0.4, s.t_end - s.t_start)),
              background: STATE_COLOR[s.state],
            }}
          />
        ))}
        {events.map((e, i) => (
          <div
            key={`ev${i}`}
            className="clip-event"
            title={`${e.kind}: ${e.note}`}
            style={{ left: pct(e.t_start) }}
          />
        ))}
        <div className="clip-playhead" style={{ left: pct(currentTime) }} />
      </div>

      <div className="clip-legend">
        {legend.map(([state, secs]) => (
          <span className="clip-legend-item" key={state}>
            <i style={{ background: STATE_COLOR[state as keyof typeof STATE_COLOR] }} />
            {STATE_LABEL[state as keyof typeof STATE_LABEL]}
            <b>{Math.round(secs)}s</b>
          </span>
        ))}
      </div>
    </div>
  );
}
