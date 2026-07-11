import {
  PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer,
} from "recharts";

/** Abstract "before / with ClassPulse" diamond — improvement across the four areas. */
const DATA = [
  { area: "Engagement", before: 58, after: 84 },
  { area: "Learning", before: 62, after: 81 },
  { area: "Efficiency", before: 51, after: 77 },
  { area: "Fun", before: 47, after: 79 },
];

const BEFORE = "#8a897f";
const AFTER = "#3987e5";

export default function ImprovementRadar() {
  return (
    <div className="landing-radar">
      <div className="landing-chart-head">
        <span className="landing-chart-title">Where teaching improves</span>
        <span className="landing-chart-sub">baseline vs. after coaching</span>
      </div>

      <div style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={DATA} outerRadius="72%">
            <PolarGrid stroke="#3a3a38" />
            <PolarAngleAxis
              dataKey="area"
              tick={{ fill: "#8a897f", fontSize: 12 }}
            />
            <Radar
              name="Before"
              dataKey="before"
              stroke={BEFORE}
              strokeWidth={2}
              fill={BEFORE}
              fillOpacity={0.1}
              isAnimationActive={false}
            />
            <Radar
              name="With ClassPulse"
              dataKey="after"
              stroke={AFTER}
              strokeWidth={2}
              fill={AFTER}
              fillOpacity={0.28}
              isAnimationActive={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="landing-chart-legend">
        {DATA.map((d) => (
          <span className="landing-delta" key={d.area}>
            {d.area}
            <b>+{d.after - d.before}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
