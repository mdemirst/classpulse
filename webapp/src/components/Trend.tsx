interface Props {
  delta: number | null;
  threshold?: number;
}

export default function Trend({ delta, threshold = 2 }: Props) {
  if (delta === null) return null;
  if (delta > threshold) return <span className="trend-up">▲ +{delta}</span>;
  if (delta < -threshold) return <span className="trend-down">▼ {delta}</span>;
  return <span className="trend-flat">— steady</span>;
}
