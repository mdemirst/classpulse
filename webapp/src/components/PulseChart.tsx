import {
  CartesianGrid, Line, LineChart, ReferenceArea, ReferenceDot,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { fmtTime } from "../api";
import { CHART, axisProps, tooltipStyle } from "../lib/chartTheme";
import type { DistractionEvent, Evidence, TimelinePoint } from "../types";

interface Props {
  data: TimelinePoint[];
  height?: number;
  highlights?: Evidence[];
  distractions?: DistractionEvent[];
  compact?: boolean;
  label?: string;
}

export default function PulseChart({
  data,
  height = 220,
  highlights = [],
  distractions = [],
  compact = false,
  label = "engagement",
}: Props) {
  if (!data.length) return null;

  return (
    <div className="card pulse-chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: compact ? -28 : -18 }}>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="2 4" vertical={false} />
          {!compact && (
            <>
              <XAxis dataKey="t" tickFormatter={fmtTime} {...axisProps} />
              <YAxis domain={[0, 100]} {...axisProps} axisLine={false} />
            </>
          )}
          {!compact && (
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(t) => `at ${fmtTime(Number(t))}`}
              formatter={(v) => [`${v}`, label]}
            />
          )}
          {distractions.map((d, i) => (
            <ReferenceArea
              key={`d-${i}`}
              x1={d.t_start}
              x2={d.t_end}
              fill="var(--serious)"
              fillOpacity={0.15}
              strokeOpacity={0}
            />
          ))}
          <Line
            type="monotone"
            dataKey="score"
            stroke={CHART.series}
            strokeWidth={compact ? 1.5 : 2}
            dot={false}
            isAnimationActive={false}
          />
          {highlights.map((h, i) => {
            const nearest = data.reduce((a, b) =>
              Math.abs(b.t - h.t) < Math.abs(a.t - h.t) ? b : a);
            return (
              <ReferenceDot
                key={`h-${i}`}
                x={nearest.t}
                y={nearest.score}
                r={compact ? 3 : 5}
                fill={CHART.highlight}
                stroke="#1a1a19"
                strokeWidth={2}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
