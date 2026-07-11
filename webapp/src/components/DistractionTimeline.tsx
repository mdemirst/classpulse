import { fmtTime } from "../api";
import { distractionColor } from "../lib/focusScore";
import type { DistractionEvent } from "../types";

interface Props {
  events: DistractionEvent[];
  duration: number;
  height?: number;
}

export default function DistractionTimeline({ events, duration, height = 10 }: Props) {
  if (!duration || !events.length) {
    return <div className="distraction-track empty" style={{ height }} />;
  }

  return (
    <div className="distraction-track" style={{ height }}>
      {events.map((e, i) => {
        const left = (e.t_start / duration) * 100;
        const width = Math.max(1, ((e.t_end - e.t_start) / duration) * 100);
        return (
          <span
            key={i}
            className="distraction-seg"
            style={{
              left: `${left}%`,
              width: `${width}%`,
              background: distractionColor(e.kind),
            }}
            title={`${e.kind.replace("_", " ")} ${fmtTime(e.t_start)}–${fmtTime(e.t_end)}: ${e.note}`}
          />
        );
      })}
    </div>
  );
}
