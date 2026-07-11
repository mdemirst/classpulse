import { hexPoints } from "../lib/hexGeometry";

interface Props {
  size?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  glow?: boolean;
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

export default function HexCell({
  size = 48,
  fill = "var(--card)",
  stroke = "var(--border)",
  strokeWidth = 1.5,
  glow = false,
  className = "",
  children,
  onClick,
}: Props) {
  const r = size / 2;
  const w = size;
  const h = size * 1.1547;
  const cx = w / 2;
  const cy = h / 2;

  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      className={`hex-cell ${className}${glow ? " glow" : ""}`}
      style={{ width: w, height: h }}
      onClick={onClick}
    >
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <polygon
          points={hexPoints(cx, cy, r * 0.92)}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      </svg>
      {children && <div className="hex-cell-content">{children}</div>}
    </Tag>
  );
}
