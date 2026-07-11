import HexCell from "./HexCell";
import { scoreColor } from "../lib/scores";

interface Props {
  label: string;
  value: string | number;
  score?: number | null;
}

export default function HexStat({ label, value, score }: Props) {
  const color = score !== undefined ? scoreColor(score) : "var(--ink)";
  return (
    <div className="hex-stat">
      <div className="hex-stat-label">{label}</div>
      <HexCell size={72} stroke={color} glow={score != null && score >= 75}>
        <span className="hex-stat-value" style={{ color }}>{value}</span>
      </HexCell>
    </div>
  );
}
