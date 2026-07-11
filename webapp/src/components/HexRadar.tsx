import {
  PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip,
} from "recharts";
import type { ClassScore, Lesson } from "../types";
import { fmtTime } from "../api";
import { DIMENSIONS, dimensionScores, scoreColor } from "../lib/scores";
import { hexPoints } from "../lib/hexGeometry";

interface Props {
  lesson?: Lesson;
  scores?: ClassScore[];
  compact?: boolean;
  showEvidence?: boolean;
}

const DIM_LABELS: Record<string, string> = {
  engagement: "Engagement",
  learning: "Learning",
  efficiency: "Efficiency",
  fun: "Fun",
};

const RADAR_COLORS = ["#3987e5", "#0ca30c", "#fab219", "#ec835a"];

export default function HexRadar({ lesson, scores: scoresProp, compact, showEvidence = true }: Props) {
  const scores = scoresProp ?? (lesson ? dimensionScores(lesson) : []);
  const data = DIMENSIONS.map((d) => {
    const s = scores.find((x) => x.dimension === d);
    return {
      dimension: DIM_LABELS[d] ?? d,
      score: s?.score ?? 0,
      fullMark: 100,
    };
  });

  const h = compact ? 140 : 220;
  const frameSize = compact ? 120 : 200;

  return (
    <div className={`hex-radar${compact ? " compact" : ""}`}>
      <div className="hex-radar-frame" style={{ height: h }}>
        <svg className="hex-radar-outline" width={frameSize} height={frameSize * 1.1547}
          viewBox={`0 0 ${frameSize} ${frameSize * 1.1547}`}
          style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
          <polygon
            points={hexPoints(frameSize / 2, (frameSize * 1.1547) / 2, frameSize * 0.46)}
            fill="none"
            stroke="var(--series)"
            strokeWidth={1.5}
            opacity={0.4}
          />
        </svg>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius={compact ? "58%" : "68%"}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="dimension" tick={{ fill: "var(--ink-3)", fontSize: compact ? 9 : 11 }} />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Radar
              dataKey="score"
              stroke="var(--series)"
              fill="var(--series)"
              fillOpacity={0.25}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      {!compact && (
        <div className="hex-radar-legend">
          {scores.map((s, i) => (
            <span key={s.dimension} className="hex-radar-legend-item">
              <i style={{ background: RADAR_COLORS[i % 4] }} />
              {DIM_LABELS[s.dimension] ?? s.dimension}
              <b style={{ color: scoreColor(s.score) }}>{s.score}</b>
            </span>
          ))}
        </div>
      )}
      {showEvidence && !compact && scores.some((s) => s.evidence.length > 0) && (
        <details className="hex-radar-evidence">
          <summary>Score evidence</summary>
          <ul>
            {scores.flatMap((s) =>
              s.evidence.map((e, i) => (
                <li key={`${s.dimension}-${i}`}>
                  <b>{DIM_LABELS[s.dimension]}</b> · {fmtTime(e.t)} — {e.note}
                </li>
              ))
            )}
          </ul>
        </details>
      )}
    </div>
  );
}
